import { NextRequest, NextResponse } from 'next/server';
import { updateCache } from '@/lib/match_data';
import pool from '@/lib/db';
import { getNextGameweekDate, initializeGameweek } from '@/lib/match_data';
import { DAYS_BEFORE_GAMEWEEK_VISIBLE, CORRECT_PREDICTION_POINTS } from '@/lib/constants';

// Add these interfaces at the top of the file
interface UnprocessedPoint {
  bet_id: number;
  fid: number;
}

async function sendTelegramAlert(message: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram configuration not found');
      return;
    }

    const prefix = message.includes('[PERFECT SCORE]') ? '' : '🚨 Alert: ';

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${prefix}${message}`,
        parse_mode: 'HTML'
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram alert:', error);
  }
}

async function checkUnprocessedMatches(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First check for unprocessed points
    const { rows: unprocessedPoints } = await client.query(`
      SELECT m.id, m.external_id, m.gameweek, b.id as bet_id, b.prediction, m.result, b.fid
      FROM matches m
      JOIN bets b ON m.id = b."matchId"
      WHERE m.is_finished = true 
      AND m.result IS NOT NULL 
      AND b.points_earned = 0
      AND b.prediction = m.result
    `);

    if (unprocessedPoints.length > 0) {
      try {
        // Award points to users
        await Promise.all(unprocessedPoints.map(async (bet) => {
          await client.query(`
            UPDATE bets 
            SET points_earned = $1 
            WHERE id = $2
          `, [CORRECT_PREDICTION_POINTS, bet.bet_id]);

          await client.query(`
            UPDATE users 
            SET xp = xp + $1 
            WHERE fid = $2
          `, [CORRECT_PREDICTION_POINTS, bet.fid]);
        }));
      } catch (error) {
        const message = `Failed to process ${unprocessedPoints.length} correct predictions: ${unprocessedPoints.map(r => 
          `Match ${r.external_id} (GW${r.gameweek}): Prediction ${r.prediction} = Result ${r.result}`
        ).join(', ')}`;
        await sendTelegramAlert(message);
        throw error;
      }
    }

    // Fix perfect score logic - check each gameweek separately
    const { rows: perfectScores } = await client.query(`
      WITH user_gameweek_stats AS (
        SELECT 
          b.fid,
          b.gameweek,
          COUNT(*) as total_bets,
          COUNT(CASE WHEN b.prediction = m.result AND m.is_finished = true THEN 1 END) as correct_bets
        FROM bets b
        JOIN matches m ON b."matchId" = m.id
        WHERE m.is_finished = true  -- Only consider finished matches
        GROUP BY b.fid, b.gameweek
        HAVING COUNT(*) >= 3  -- At least 3 bets
        AND COUNT(CASE WHEN b.prediction = m.result THEN 1 END) = COUNT(*)  -- All bets correct
      )
      SELECT 
        s.fid,
        s.gameweek,
        u.display_name,
        s.total_bets,
        s.correct_bets,
        u.perfect_score as current_perfect_score
      FROM user_gameweek_stats s
      JOIN users u ON s.fid = u.fid
      JOIN gameweeks gw ON s.gameweek = gw.gameweek_number
      WHERE gw.points_calculated = false  -- Only for gameweeks not yet marked as calculated
      AND NOT EXISTS (
        SELECT 1 
        FROM bets b2
        JOIN matches m2 ON b2."matchId" = m2.id
        WHERE b2.fid = s.fid 
        AND b2.gameweek = s.gameweek
        AND m2.is_finished = true
        AND b2.prediction != m2.result  -- Make sure there are no incorrect predictions
      )
    `);

    if (perfectScores.length > 0) {
      try {
        await Promise.all(perfectScores.map(async (score) => {
          // Update perfect_score in users table
          await client.query(`
            UPDATE users 
            SET perfect_score = perfect_score + 1
            WHERE fid = $1
          `, [score.fid]);

          const message = `🎯 Perfect Score Achievement: ${score.display_name} got ${score.correct_bets}/${score.total_bets} correct in GW${score.gameweek} (Perfect Score total: ${score.current_perfect_score + 1})`;
          await sendTelegramAlert(message);
        }));
      } catch (error) {
        await sendTelegramAlert(`[ERROR] Failed to process perfect scores: ${error}`);
        throw error;
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkAndInitiateNextGameweek(): Promise<void> {
  const client = await pool.connect();
  try {
    // First check if previous gameweek is fully completed
    const { rows: latestGameweek } = await client.query(`
      SELECT gw.gameweek_number, gw.end_date
      FROM gameweeks gw
      WHERE gw.points_calculated = true
      AND NOT EXISTS (
        SELECT 1 
        FROM matches m 
        WHERE m.gameweek = gw.gameweek_number 
        AND (m.is_finished = false OR m.result IS NULL)
      )
      ORDER BY gw.gameweek_number DESC
      LIMIT 1
    `);

    if (latestGameweek.length > 0) {
      const currentGameweek = latestGameweek[0].gameweek_number;
      const nextGameweekNumber = currentGameweek + 1;
      
      // Check if next gameweek already exists in database
      const { rows: existingGameweek } = await client.query(`
        SELECT gameweek_number 
        FROM gameweeks 
        WHERE gameweek_number = $1
      `, [nextGameweekNumber]);

      // If gameweek already exists, skip initialization
      if (existingGameweek.length > 0) {
        console.log(`Gameweek ${nextGameweekNumber} already initialized, skipping...`);
        return;
      }
      
      // Get the next gameweek's start date from FPL API
      const nextGameweekDate = await getNextGameweekDate(nextGameweekNumber);
      
      if (nextGameweekDate) {
        const now = new Date();
        const visibilityThreshold = new Date(nextGameweekDate);
        visibilityThreshold.setDate(visibilityThreshold.getDate() - DAYS_BEFORE_GAMEWEEK_VISIBLE);

        // Check if we're within the initialization window
        if (now >= visibilityThreshold) {
          console.log(`Initiating gameweek ${nextGameweekNumber}`);
          
          // Initialize the gameweek using our existing function
          await initializeGameweek(nextGameweekNumber, client);
          
          // Update cache with next gameweek's matches
          await updateCache(nextGameweekNumber);
          
          // Send notification only for new initialization
          await sendTelegramAlert(`🆕 Gameweek ${nextGameweekNumber} has been initialized and is ready for betting!`);
        } else {
          console.log(`Too early to initialize gameweek ${nextGameweekNumber}. Will be available on ${visibilityThreshold.toISOString()}`);
        }
      }
    } else {
      console.log('Previous gameweek not fully completed yet');
    }
  } finally {
    client.release();
  }
}

async function checkAndMarkCompletedGameweeks(): Promise<void> {
  const client = await pool.connect();
  try {
    // Find gameweeks that should be marked as completed
    const { rows: completedGameweeks } = await client.query(`
      SELECT DISTINCT gw.gameweek_number
      FROM gameweeks gw
      WHERE gw.points_calculated = false
      AND gw.end_date < NOW()
      AND NOT EXISTS (
        SELECT 1 
        FROM matches m 
        WHERE m.gameweek = gw.gameweek_number 
        AND (m.is_finished = false OR m.result IS NULL)
      )
    `);

    for (const row of completedGameweeks) {
      // Verify all points are awarded
      const { rows: unprocessedBets } = await client.query(`
        SELECT COUNT(*) as count
        FROM bets b
        JOIN matches m ON b."matchId" = m.id
        WHERE m.gameweek = $1
        AND m.is_finished = true
        AND b.prediction = m.result
        AND (b.points_earned IS NULL OR b.points_earned = 0)
      `, [row.gameweek_number]);

      if (parseInt(unprocessedBets[0].count) === 0) {
        await client.query(`
          UPDATE gameweeks 
          SET points_calculated = true 
          WHERE gameweek_number = $1
        `, [row.gameweek_number]);
        
        await sendTelegramAlert(`🏁 Gameweek ${row.gameweek_number} has been marked as completed.`);
      }
    }
  } finally {
    client.release();
  }
}

async function verifyPointsAwarded(client: any): Promise<void> {
  // Get all unprocessed points first
  const { rows: unprocessedPoints } = await client.query(`
    SELECT b.id as bet_id, b.fid
    FROM matches m
    JOIN bets b ON m.id = b."matchId"
    WHERE m.is_finished = true 
    AND m.result IS NOT NULL 
    AND b.points_earned = 0
    AND b.prediction = m.result
  `) as { rows: UnprocessedPoint[] };

  if (unprocessedPoints.length === 0) {
    return;
  }

  // Verify bets were updated
  const betIds = unprocessedPoints.map((p: UnprocessedPoint) => p.bet_id);
  const { rows: verifyBets } = await client.query(`
    SELECT COUNT(*) as count
    FROM bets
    WHERE id = ANY($1)
    AND points_earned = 0
  `, [betIds]);

  if (parseInt(verifyBets[0].count) > 0) {
    throw new Error(`Failed to update points for ${verifyBets[0].count} bets`);
  }

  // Verify users' XP was updated - use Array instead of Set
  const userFids = Array.from(new Set(unprocessedPoints.map((p: UnprocessedPoint) => p.fid)));
  
  for (const fid of userFids) {
    const { rows: userPoints } = await client.query(`
      SELECT xp, 
        (SELECT COUNT(*) FROM bets b 
         JOIN matches m ON b."matchId" = m.id 
         WHERE b.fid = $1 
         AND b.points_earned = $2 
         AND m.is_finished = true 
         AND b.prediction = m.result) as correct_predictions
      FROM users 
      WHERE fid = $1
    `, [fid, CORRECT_PREDICTION_POINTS]);

    if (userPoints.length > 0) {
      const expectedXP = parseInt(userPoints[0].correct_predictions);
      if (userPoints[0].xp !== expectedXP) {
        await client.query(`
          UPDATE users 
          SET xp = $1 
          WHERE fid = $2
        `, [expectedXP, fid]);
        await sendTelegramAlert(`Fixed XP for user ${fid}: Set to ${expectedXP}`);
      }
    }
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First update the cache and process current matches
    try {
      await updateCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await sendTelegramAlert(`[Cache Update Error] 🔄: ${errorMessage}`);
      throw error;
    }

    // Check for unprocessed matches and points
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await checkUnprocessedMatches();
        await verifyPointsAwarded(client);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await sendTelegramAlert(`[Unprocessed Matches Error] ⚽: ${errorMessage}`);
      throw error;
    }

    // Check and mark completed gameweeks
    try {
      await checkAndMarkCompletedGameweeks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await sendTelegramAlert(`[Completed Gameweeks Error] 📅: ${errorMessage}`);
      throw error;
    }

    // Check and initiate next gameweek if needed
    try {
      await checkAndInitiateNextGameweek();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await sendTelegramAlert(`[Next Gameweek Error] 📅: ${errorMessage}`);
      throw error;
    }

    return NextResponse.json({ message: 'Database and cache updated successfully' });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Failed to update database and cache' }, { status: 500 });
  }
}

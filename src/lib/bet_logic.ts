import pool from './db';
import { Bet, User, CachedMatchData } from './types';
import { CORRECT_PREDICTION_POINTS, DAYS_BEFORE_GAMEWEEK_VISIBLE } from './constants';
import { getOrCreateUser } from './user_operations';
import { updateDatabase } from './match_data';
import { getMatchDeadline, isMatchBettingOpen } from './gameUtils';

export async function placeBet(fid: number, matchId: string, prediction: '1' | 'X' | '2', display_name: string, pfp_url: string, is_x2: boolean = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get or create the user
    const user = await getOrCreateUser(fid, display_name, pfp_url);

    // Get the match details
    const { rows: matchRows } = await client.query('SELECT gameweek, kickoff_time FROM matches WHERE id = $1', [matchId]);
    if (matchRows.length === 0) {
      console.error(`Match with ID ${matchId} not found in the database`);
      throw new Error(`Match with ID ${matchId} not found in the database`);
    }

    const match = {
      id: matchId,
      kickoff_time: matchRows[0].kickoff_time,
      gameweek: matchRows[0].gameweek
    } as CachedMatchData;

    const now = new Date();
    const deadline = getMatchDeadline(match);


    // Check if the deadline has passed
    if (now >= deadline) {
      throw new Error("Cannot place or update a bet after the deadline");
    }

    // Insert or update the bet
    const result = await client.query(`
      INSERT INTO bets (fid, "matchId", gameweek, prediction, is_x2, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (fid, "matchId") DO UPDATE
      SET prediction = EXCLUDED.prediction, is_x2 = EXCLUDED.is_x2, "updatedAt" = NOW(), gameweek = EXCLUDED.gameweek
      RETURNING *
    `, [fid, matchId, match.gameweek, prediction, is_x2]);

    // Update last_played timestamp
    await client.query(`
      UPDATE users
      SET last_played = NOW()
      WHERE fid = $1
    `, [fid]);

    await client.query('COMMIT');
    return result.rows[0];  // Return the inserted or updated bet
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error in placeBet:', e);
    throw e;
  } finally {
    client.release();
  }
}

export async function getBetsForUser(fid: number, gameweek: number): Promise<Bet[]> {
  const { rows } = await pool.query(`
    SELECT * FROM bets WHERE fid = $1 AND gameweek = $2
  `, [fid, gameweek]);
  return rows;
}

export async function getUserXP(fid: number): Promise<number> {
  const { rows } = await pool.query('SELECT xp FROM users WHERE fid = $1', [fid]);
  return rows[0]?.xp || 0;
}

export async function calculateAndSaveGameweekScore(fid: number, gameweek: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bets } = await client.query(`
      SELECT b.*, m.result 
      FROM bets b 
      JOIN matches m ON b."matchId" = m.id 
      WHERE b.fid = $1 AND m.gameweek = $2 AND m."is_finished" = true
    `, [fid, gameweek]);

    let score = 0;
    for (const bet of bets) {
      if (bet.prediction === bet.result) {
        score += CORRECT_PREDICTION_POINTS;
      }
    }

    await client.query(`
      UPDATE users SET xp = xp + $1 WHERE fid = $2
    `, [score, fid]);

    await client.query('COMMIT');
    return score;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getLeaderboard(limit: number = 10): Promise<User[]> {
  const { rows } = await pool.query(`
    SELECT fid, display_name, title, xp, level, total_gameweeks_played
    FROM users 
    ORDER BY xp DESC 
    LIMIT $1
  `, [limit]);
  return rows;
}

export async function getLastPlayedTimestamp(fid: number): Promise<number | null> {
  const { rows } = await pool.query('SELECT last_played FROM users WHERE fid = $1', [fid]);
  return rows[0]?.last_played?.getTime() || null;
}

export async function hasOngoingBetInGameweek(fid: number, gameweek: number): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT 1 FROM bets 
    WHERE fid = $1 AND gameweek = $2 
    LIMIT 1
  `, [fid, gameweek]);
  return rows.length > 0;
}

/**
 * Checks if a user can place or edit a bet for a match
 */
export async function canUserPlay(fid: number, matchId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rows: matches } = await client.query(
      'SELECT kickoff_time FROM matches WHERE id = $1',
      [matchId]
    );

    if (matches.length === 0) return false;

    const match = {
      id: matchId,
      kickoff_time: matches[0].kickoff_time
    } as CachedMatchData;

    return isMatchBettingOpen(match);
  } finally {
    client.release();
  }
}

export async function getUserBet(fid: number, matchId: number): Promise<Bet | null> {
  const { rows } = await pool.query(`
    SELECT * FROM bets WHERE fid = $1 AND "matchId" = $2
  `, [fid, matchId]);
  return rows[0] || null;
}

export function isGameAvailable(game: any, currentTime: Date): boolean {
  const deadline = new Date(game.deadline || game.matchDeadline);
  return currentTime < deadline;
}

export async function checkAndUpdateFinishedGames(): Promise<void> {
  console.log('Checking and updating finished games');
  await updateDatabase();
}

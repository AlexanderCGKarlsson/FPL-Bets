import { kv } from '@vercel/kv';
import { FPLFixture, FPLTeam, CachedMatchData, FPLEvent } from '@/lib/types';
import pool from '@/lib/db';
import { fetchFixtures, fetchTeams } from '@/lib/api';
import { DEADLINE_OFFSET_MINUTES, BIG_TEAMS, MATCHES_TO_FETCH, CORRECT_PREDICTION_POINTS, DAYS_BEFORE_GAMEWEEK_VISIBLE, BYPASS_CACHE } from '@/lib/constants';

const CACHE_PREFIX = 'match_data:';
const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export function formatDate(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
    hour12: false
  });
}

// Gameweek related functions
export async function getCurrentGameweek(): Promise<number> {
  const client = await pool.connect();
  try {
    // Get the most recent unfinished gameweek
    const { rows } = await client.query(`
      SELECT DISTINCT gameweek
      FROM matches
      WHERE is_finished = false
      ORDER BY gameweek ASC
      LIMIT 1
    `);

    if (rows.length > 0) {
      return rows[0].gameweek;
    }

    // If all matches are finished, get the latest gameweek
    const { rows: latestGw } = await client.query(`
      SELECT gameweek
      FROM matches
      ORDER BY gameweek DESC
      LIMIT 1
    `);

    return latestGw.length > 0 ? latestGw[0].gameweek : 1;
  } finally {
    client.release();
  }
}

function formatTimeDifference(futureDate: Date): string {
  const now = new Date();
  const diffMs = futureDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffDays} days, ${diffHours} hours, ${diffMinutes} minutes`;
}

function getCurrentOrNextGameweek(events: any[]): number {
  const now = new Date();
  
  // Sort events by deadline_time
  const sortedEvents = events.sort((a, b) => new Date(a.deadline_time).getTime() - new Date(b.deadline_time).getTime());

  // Find the first event that hasn't started yet
  const nextEvent = sortedEvents.find(event => new Date(event.deadline_time) > now);

  if (nextEvent) {
    return nextEvent.id;
  }

  // If all events are in the past, return the last event
  return sortedEvents[sortedEvents.length - 1].id;
}

async function getNextMatchTime(gameweek: number): Promise<Date | null> {
  const fixtures = await fetchFixtures() as FPLFixture[];
  const gameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  if (gameweekFixtures.length === 0) return null;
  
  const sortedFixtures = gameweekFixtures.sort((a, b) => 
    new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
  );
  
  return new Date(sortedFixtures[0].kickoff_time);
}

// Match data fetching and processing
async function fetchFromAPI(gameweek: number): Promise<CachedMatchData[]> {
  const fixtures = await fetchFixtures() as FPLFixture[];
  const { teams, events } = await fetchTeams();

  // Add logging
  console.log('Fetching matches for gameweek:', gameweek);
  const gameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  console.log('All fixtures for gameweek:', gameweekFixtures.map(f => ({
    id: f.id,
    kickoff: new Date(f.kickoff_time).toISOString(),
    event: f.event
  })));

  const selectedFixtures = selectFixtures(gameweekFixtures, teams);
  console.log('Selected fixtures:', selectedFixtures.map(f => ({
    id: f.id,
    kickoff: new Date(f.kickoff_time).toISOString(),
    event: f.event
  })));

  if (selectedFixtures.length === 0) {
    console.log(`No fixtures available for gameweek ${gameweek}`);
    return [];
  }

  return selectedFixtures.map(fixture => {
    const homeTeam = teams.find(team => team.id === fixture.team_h);
    const awayTeam = teams.find(team => team.id === fixture.team_a);

    const kickoff_time = new Date(fixture.kickoff_time);
    const deadline = new Date(kickoff_time.getTime() - DEADLINE_OFFSET_MINUTES * 60 * 1000);

    const isLive = (fixture.started || false) && !fixture.finished;

    return {
      id: generateUniqueId(fixture),
      external_id: fixture.id.toString(),
      kickoff_time,
      deadline,
      gameweek: fixture.event,
      is_finished: fixture.finished,
      result: calculateResult(fixture),
      homeTeam: homeTeam?.name || '',
      homeTeamId: homeTeam?.id || 0,
      awayTeamId: awayTeam?.id || 0,
      awayTeam: awayTeam?.name || '',
      homeTeamLogo: homeTeam?.logoUrl || '',
      awayTeamLogo: awayTeam?.logoUrl || '',
      homeScore: fixture.team_h_score ?? undefined,
      awayScore: fixture.team_a_score ?? undefined,
      isLive,
      minute: isLive ? fixture.minutes : undefined,
    };
  });
}

function selectFixtures(fixtures: FPLFixture[], teams: FPLTeam[]): FPLFixture[] {
  // Step 1: Identify big team matches and derbies
  const bigTeamMatches = fixtures.filter(fixture => {
    const homeTeam = teams.find(team => team.id === fixture.team_h);
    const awayTeam = teams.find(team => team.id === fixture.team_a);
    return homeTeam && awayTeam && (BIG_TEAMS.includes(homeTeam.name) || BIG_TEAMS.includes(awayTeam.name));
  });

  const derbies = bigTeamMatches.filter(fixture => {
    const homeTeam = teams.find(team => team.id === fixture.team_h);
    const awayTeam = teams.find(team => team.id === fixture.team_a);
    return homeTeam && awayTeam && BIG_TEAMS.includes(homeTeam.name) && BIG_TEAMS.includes(awayTeam.name);
  });

  let selectedFixtures: FPLFixture[] = [];

  // Step 2: Always include derbies
  selectedFixtures = [...derbies];

  // Step 3: Add other big team matches if needed
  if (selectedFixtures.length < MATCHES_TO_FETCH) {
    const otherBigTeamMatches = bigTeamMatches.filter(match => !derbies.includes(match));
    selectedFixtures = [
      ...selectedFixtures,
      ...otherBigTeamMatches.slice(0, MATCHES_TO_FETCH - selectedFixtures.length)
    ];
  }

  // Step 4: If we still don't have enough matches, add more matches based on team ranking
  if (selectedFixtures.length < MATCHES_TO_FETCH) {
    const remainingMatches = fixtures.filter(fixture => !selectedFixtures.includes(fixture));
    const sortedRemainingMatches = remainingMatches.sort((a, b) => {
      const homeTeamA = teams.find(team => team.id === a.team_h);
      const awayTeamA = teams.find(team => team.id === a.team_a);
      const homeTeamB = teams.find(team => team.id === b.team_h);
      const awayTeamB = teams.find(team => team.id === b.team_a);
      const rankSumA = (homeTeamA?.strength_overall_home || 0) + (awayTeamA?.strength_overall_away || 0);
      const rankSumB = (homeTeamB?.strength_overall_home || 0) + (awayTeamB?.strength_overall_away || 0);
      return rankSumB - rankSumA; // Sort by descending rank sum
    });
    selectedFixtures = [
      ...selectedFixtures,
      ...sortedRemainingMatches.slice(0, MATCHES_TO_FETCH - selectedFixtures.length)
    ];
  }

  return selectedFixtures.slice(0, MATCHES_TO_FETCH);
}

function generateUniqueId(fixture: FPLFixture): string {
  const year = new Date(fixture.kickoff_time).getFullYear() % 100;
  return `${year}${fixture.event}${fixture.id}`;
}

function calculateResult(fixture: FPLFixture | undefined): '1' | 'X' | '2' | null {
  if (fixture && fixture.finished && fixture.finished_provisional) {
    if (fixture.team_h_score !== null && fixture.team_a_score !== null) {
      if (fixture.team_h_score > fixture.team_a_score) return '1';
      if (fixture.team_h_score < fixture.team_a_score) return '2';
      return 'X';
    } else {
      console.log(`Match ${fixture.id} is finished but scores are not available`);
      return null;
    }
  }
  return null;
}

// Cache management
export async function updateCache(specificGameweek?: number): Promise<void> {
  const currentGameweek = specificGameweek || await getCurrentGameweek();
  const cacheKey = `${CACHE_PREFIX}${currentGameweek}`;

  console.log(`Updating cache for gameweek ${currentGameweek}`);
  
  try {
    const matches = await fetchFromAPI(currentGameweek);
    if (matches.length > 0) {
      await updateDatabaseWithMatchData(matches);
      await kv.set(cacheKey, JSON.stringify(matches), { ex: CACHE_DURATION });
    }
  } catch (error) {
    console.error('Error updating cache:', error);
    throw error;
  }
}

export async function fetchMatchData(forMatchup: boolean = false): Promise<{ matches: CachedMatchData[], isVisible: boolean, message: string }> {
  const currentGameweek = await getCurrentGameweek();
  const cacheKey = `${CACHE_PREFIX}${currentGameweek}`;
  
  let matches: CachedMatchData[] = [];
  
  if (!BYPASS_CACHE) {
    const cachedData = await kv.get(cacheKey);
    if (cachedData) {
      matches = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    }
  }

  if (matches.length === 0) {
    // Fetch basic match data from database
    const dbMatches = await fetchMatchDataFromDatabase(currentGameweek);

    if (dbMatches.length > 0) {
      const fixtures = await fetchFixtures() as FPLFixture[];
      const { teams } = await fetchTeams();

      matches = dbMatches.map(dbMatch => {
        const fixture = fixtures.find(f => f.id.toString() === dbMatch.external_id);
        const homeTeam = teams.find(team => team.id === fixture?.team_h);
        const awayTeam = teams.find(team => team.id === fixture?.team_a);

        return {
          ...dbMatch,
          homeTeam: homeTeam?.name || '',
          awayTeam: awayTeam?.name || '',
          homeTeamId: homeTeam?.id || 0,
          awayTeamId: awayTeam?.id || 0,
          homeTeamLogo: homeTeam?.logoUrl || '',
          awayTeamLogo: awayTeam?.logoUrl || '',
          is_finished: fixture?.finished && fixture?.finished_provisional || false,
          result: fixture ? calculateResult(fixture) : null,
        } as CachedMatchData; // Type assertion to CachedMatchData
      });

      if (!BYPASS_CACHE) {
        await kv.set(cacheKey, JSON.stringify(matches), { ex: CACHE_DURATION });
      }
    } else {
      console.log('No matches found in database, fetching from API');
      matches = await fetchFromAPI(currentGameweek);
      if (matches.length > 0) {
        await updateDatabaseWithMatchData(matches);
        if (!BYPASS_CACHE) {
          await kv.set(cacheKey, JSON.stringify(matches), { ex: CACHE_DURATION });
        }
      }
    }
  }

  // Sort matches by kickoff time
  matches.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());

  if (!forMatchup) {
    // For welcome and bet-overview, show all matches
    return {
      matches,
      isVisible: true,
      message: "Showing all matches for this gameweek."
    };
  }

  const now = new Date();
  const firstMatch = matches[0];
  const firstMatchKickoff = new Date(firstMatch.kickoff_time);
  const visibilityThreshold = new Date(firstMatchKickoff);
  visibilityThreshold.setDate(visibilityThreshold.getDate() - DAYS_BEFORE_GAMEWEEK_VISIBLE);

  // If before visibility window, return empty
  if (now < visibilityThreshold) {
    return {
      matches: [],
      isVisible: false,
      message: `Betting will be available on ${formatDate(visibilityThreshold)}.`
    };
  }

  // Filter to only show matches that haven't passed their deadline
  const availableMatches = matches.filter(match => {
    const kickoff_time = new Date(match.kickoff_time);
    const deadline = new Date(kickoff_time.getTime() - 60 * 60 * 1000);
    return now < deadline;
  });

  return {
    matches: availableMatches,
    isVisible: availableMatches.length > 0,
    message: availableMatches.length > 0 
      ? "Matches are available for betting."
      : "All match deadlines have passed for this gameweek."
  };
}

async function fetchMatchesFromAPIByExternalIds(externalIds: string[]): Promise<CachedMatchData[]> {
  const fixtures = await fetchFixtures() as FPLFixture[];
  const { teams } = await fetchTeams();

  const selectedFixtures = fixtures.filter(fixture => externalIds.includes(fixture.id.toString()));

  return selectedFixtures.map(fixture => {
    const homeTeam = teams.find(team => team.id === fixture.team_h);
    const awayTeam = teams.find(team => team.id === fixture.team_a);

    const kickoff_time = new Date(fixture.kickoff_time);
    const deadline = new Date(kickoff_time.getTime() - DEADLINE_OFFSET_MINUTES * 60 * 1000);

    return {
      id: generateUniqueId(fixture),
      external_id: fixture.id.toString(),
      kickoff_time,
      deadline,
      gameweek: fixture.event,
      is_finished: fixture.finished && fixture.finished_provisional,
      result: calculateResult(fixture),
      homeTeam: homeTeam?.name || '',
      homeTeamId: homeTeam?.id || 0,
      awayTeamId: awayTeam?.id || 0,
      awayTeam: awayTeam?.name || '',
      homeTeamLogo: homeTeam?.logoUrl || '',
      awayTeamLogo: awayTeam?.logoUrl || '',
    };
  });
}

export async function fetchMatchDataFromDatabase(gameweek: number): Promise<Partial<CachedMatchData>[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, external_id, kickoff_time, deadline, gameweek FROM matches WHERE gameweek = $1', [gameweek]);
    if (rows.length === 0) {
      console.log(`No matches found in database for gameweek ${gameweek}`);
      return [];
    }


    const matches = rows.map(row => ({
      id: row.id,
      external_id: row.external_id,
      kickoff_time: new Date(row.kickoff_time),
      deadline: new Date(row.deadline),
      gameweek: row.gameweek,
      is_finished: false, // Default value
      result: null, // Default value
      homeTeam: '', // Default value
      awayTeam: '', // Default value
      homeTeamId: 0, // Default value
      awayTeamId: 0, // Default value
      homeTeamLogo: '', // Default value
      awayTeamLogo: '', // Default value
    }));

    return matches;
  } finally {
    client.release();
  }
}

// Database operations
async function updateDatabaseWithMatchData(matchData: CachedMatchData[]): Promise<void> {
  console.log(`Updating database with ${matchData.length} matches`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const match of matchData) {
      console.log(`Upserting match: ${match.id}`);
      await client.query(`
        INSERT INTO matches (id, external_id, kickoff_time, deadline, gameweek, is_finished, result)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) 
        DO UPDATE SET
          external_id = EXCLUDED.external_id,
          kickoff_time = EXCLUDED.kickoff_time,
          deadline = EXCLUDED.deadline,
          gameweek = EXCLUDED.gameweek,
          is_finished = EXCLUDED.is_finished,
          result = EXCLUDED.result
      `, [match.id, match.external_id, match.kickoff_time, match.deadline, match.gameweek, match.is_finished, match.result]);
    }
    
    // Update gameweek dates
    const gameweek = matchData[0].gameweek;
    await updateGameweekDates(gameweek, matchData, client);
    
    await client.query('COMMIT');
    console.log('Database update completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating database with match data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram credentials not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

export async function updateDatabase(): Promise<void> {
  const currentGameweek = await getCurrentGameweek();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: matches } = await client.query(`
      SELECT * FROM matches 
      WHERE is_finished = false OR result IS NULL
      ORDER BY gameweek DESC, kickoff_time ASC
    `);

    const fixtures = await fetchFixtures() as FPLFixture[];
    let updatedMatchesCount = 0;
    let updatedMatchDetails: Array<{
      matchId: string,
      result: string,
      totalBets: number,
      usersUpdated: number,
      correctPredictions: number,
      predictionBreakdown: {
        '1': number,
        'X': number,
        '2': number
      }
    }> = [];

    for (const match of matches) {
      const fixture = fixtures.find(f => f.id.toString() === match.external_id);
      if (fixture) {
        const newResult = calculateResult(fixture);
        if (newResult !== null && (!match.is_finished || match.result !== newResult)) {
          const matchUpdate = await updateMatchResult(match, fixture, client);
          if (matchUpdate.usersUpdated > 0) {
            // Get detailed prediction breakdown
            const { rows: predictionStats } = await client.query(`
              SELECT 
                prediction,
                COUNT(*) as count,
                SUM(CASE WHEN points_earned = ${CORRECT_PREDICTION_POINTS} THEN 1 ELSE 0 END) as correct_count
              FROM bets
              WHERE "matchId" = $1
              GROUP BY prediction
            `, [match.id]);

            const predictionBreakdown = predictionStats.reduce((acc, stat) => ({
              ...acc,
              [stat.prediction]: parseInt(stat.count)
            }), { '1': 0, 'X': 0, '2': 0 });

            const { rows: correctPredictions } = await client.query(`
              SELECT COUNT(*) as correct_count
              FROM bets
              WHERE "matchId" = $1
              AND prediction = $2
              AND points_earned = ${CORRECT_PREDICTION_POINTS}
            `, [match.id, newResult]);

            updatedMatchDetails.push({
              matchId: match.external_id,
              result: newResult,
              totalBets: matchUpdate.totalBets,
              usersUpdated: matchUpdate.usersUpdated,
              correctPredictions: parseInt(correctPredictions[0].correct_count),
              predictionBreakdown
            });
          }
          updatedMatchesCount++;
        }
      }
    }

    // Verify and fix any missing points
    await verifyAndFixPoints(client);

    // Update all user XP once at the end
    await updateAllUserXP(client);

    await client.query('COMMIT');

    // Only send notification if points were actually awarded
    if (updatedMatchDetails.length > 0) {
      let totalCorrectPredictions = updatedMatchDetails.reduce((sum, match) => sum + match.correctPredictions, 0);
      
      const message = `🎮 Points Update - GW${currentGameweek}\n\n${
        updatedMatchDetails.map(match => 
          `Match ${match.matchId}:\n` +
          `Result: ${match.result}\n` +
          `Total Bets: ${match.totalBets}\n` +
          `Prediction Breakdown:\n` +
          `  Home (1): ${match.predictionBreakdown['1']} bets\n` +
          `  Draw (X): ${match.predictionBreakdown['X']} bets\n` +
          `  Away (2): ${match.predictionBreakdown['2']} bets\n` +
          `Correct Predictions: ${match.correctPredictions} 🎯\n` +
          `Success Rate: ${((match.correctPredictions / match.totalBets) * 100).toFixed(1)}%\n`
        ).join('\n')
      }\n📊 Summary:\n` +
      `Total Bets: ${updatedMatchDetails.reduce((sum, m) => sum + m.totalBets, 0)}\n` +
      `Total Correct Predictions: ${totalCorrectPredictions} 🎯\n` +
      `Overall Success Rate: ${((totalCorrectPredictions / updatedMatchDetails.reduce((sum, m) => sum + m.totalBets, 0)) * 100).toFixed(1)}%`;
      
      await sendTelegramNotification(message);
    }

    // After all matches are processed, check for completed gameweeks
    const { rows: completedGameweeks } = await client.query(`
      SELECT DISTINCT m.gameweek
      FROM matches m
      WHERE NOT EXISTS (
        SELECT 1 
        FROM matches m2 
        WHERE m2.gameweek = m.gameweek 
        AND (m2.is_finished = false OR m2.result IS NULL)
      )
      AND NOT EXISTS (
        SELECT 1 
        FROM gameweeks gw 
        WHERE gw.gameweek_number = m.gameweek 
        AND gw.points_calculated = true
      )
    `);

    // Mark completed gameweeks
    for (const row of completedGameweeks) {
      // Verify all points are awarded before marking as calculated
      const { rows: unprocessedBets } = await client.query(`
        SELECT COUNT(*) as count
        FROM bets b
        JOIN matches m ON b."matchId" = m.id
        WHERE m.gameweek = $1
        AND m.is_finished = true
        AND b.prediction = m.result
        AND (b.points_earned IS NULL OR b.points_earned = 0)
      `, [row.gameweek]);

      if (parseInt(unprocessedBets[0].count) === 0) {
        await client.query(`
          UPDATE gameweeks 
          SET points_calculated = true 
          WHERE gameweek_number = $1
        `, [row.gameweek]);
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

async function updateMatchResult(match: any, fixture: FPLFixture, client: any): Promise<{ totalBets: number; usersUpdated: number }> {
  const result = calculateResult(fixture);
  if (result !== null) {
    await client.query(`
      UPDATE matches 
      SET is_finished = true, result = $1
      WHERE id = $2
    `, [result, match.id]);

    // Get update statistics
    const updatedScores = await updateScoresForMatch(match, result, client);
    await updateGameweekStatistics(match.gameweek, updatedScores, client);

    return {
      totalBets: updatedScores.totalBets,
      usersUpdated: updatedScores.totalPlayers
    };
  }
  
  return { totalBets: 0, usersUpdated: 0 };
}

async function updateScoresForMatch(match: any, result: string, client: any): Promise<{ totalBets: number, totalPlayers: number, userScores: Map<number, number> }> {
  // First, verify which bets should receive points
  const { rows: betsToUpdate } = await client.query(`
    SELECT id, fid, prediction, points_earned
    FROM bets 
    WHERE "matchId" = $1
    AND prediction = $2
    AND (points_earned IS NULL OR points_earned = 0)
  `, [match.id, result]);

  if (betsToUpdate.length > 0) {
    // Updates points_earned for qualifying bets
    await client.query(`
      UPDATE bets
      SET points_earned = $1
      WHERE "matchId" = $2
      AND prediction = $3
      AND (points_earned IS NULL OR points_earned = 0)
    `, [CORRECT_PREDICTION_POINTS, match.id, result]);

    // Check for perfect scores in the gameweek
    const { rows: perfectScores } = await client.query(`
      WITH user_predictions AS (
        SELECT 
          b.fid,
          COUNT(*) as total_predictions,
          COUNT(CASE WHEN b.points_earned > 0 THEN 1 END) as correct_predictions
        FROM bets b
        JOIN matches m ON b."matchId" = m.id
        WHERE b.gameweek = $1 AND m.is_finished = true
        GROUP BY b.fid
      )
      SELECT 
        fid 
      FROM user_predictions 
      WHERE total_predictions = correct_predictions 
      AND total_predictions >= 3
    `, [match.gameweek]);

    // Update perfect_score for users who got all predictions correct
    if (perfectScores.length > 0) {
      const perfectUserFids = perfectScores.map((row: { fid: number }) => row.fid);
      await client.query(`
        UPDATE users 
        SET perfect_score = perfect_score + 1
        WHERE fid = ANY($1)
      `, [perfectUserFids]);
    }

    // Get total bets for statistics
    const { rows: [ { total_bets } ] } = await client.query(`
      SELECT COUNT(*) as total_bets
      FROM bets 
      WHERE "matchId" = $1
    `, [match.id]);

    return {
      totalBets: parseInt(total_bets),
      totalPlayers: new Set(betsToUpdate.map((bet: { fid: number }) => bet.fid)).size,
      userScores: new Map(betsToUpdate.map((bet: { fid: number }) => [bet.fid, CORRECT_PREDICTION_POINTS]))
    };
  }

  return { totalBets: 0, totalPlayers: 0, userScores: new Map() };
}

async function updateAllUserXP(client: any): Promise<void> {
  await client.query(`
    WITH user_points AS (
      SELECT 
        fid,
        SUM(COALESCE(points_earned, 0)) as total_points
      FROM bets
      GROUP BY fid
    )
    UPDATE users u
    SET xp = up.total_points
    FROM user_points up
    WHERE u.fid = up.fid
  `);
}

async function updateGameweekStatistics(gameweek: number, scores: { totalBets: number, totalPlayers: number, userScores: Map<number, number> }, client: any) {
  // Fetch existing gameweek data
  const { rows: existingGameweek } = await client.query(`
    SELECT total_bets, total_players, top_score
    FROM gameweeks
    WHERE gameweek_number = $1
  `, [gameweek]);

  let existingTotalBets = 0;
  let existingTotalPlayers = 0;
  let existingTopScore = 0;

  if (existingGameweek.length > 0) {
    existingTotalBets = existingGameweek[0].total_bets;
    existingTotalPlayers = existingGameweek[0].total_players;
    existingTopScore = existingGameweek[0].top_score;
  }

  // Update the statistics
  const newTotalBets = existingTotalBets + scores.totalBets;
  const newTotalPlayers = Math.max(existingTotalPlayers, scores.totalPlayers);
  
  // Fetch all user scores for this gameweek
  const { rows: allUserScores } = await client.query(`
    SELECT fid, SUM(points_earned) as total_points
    FROM bets
    WHERE gameweek = $1
    GROUP BY fid
  `, [gameweek]);

  // Calculate the new top score
  const newTopScore = Math.max(
    existingTopScore,
    ...allUserScores.map((score: { total_points: number }) => score.total_points),
    ...Array.from(scores.userScores.values())
  );

  // Update the gameweek statistics
  await client.query(`
    INSERT INTO gameweeks (gameweek_number, points_calculated, total_bets, total_players, top_score)
    VALUES ($1, true, $2, $3, $4)
    ON CONFLICT (gameweek_number) 
    DO UPDATE SET
      points_calculated = true,
      total_bets = $2,
      total_players = $3,
      top_score = $4
  `, [gameweek, newTotalBets, newTotalPlayers, newTopScore]);

}

export async function getNextGameweekDate(gameweekNumber: number): Promise<Date | null> {
  const { events } = await fetchTeams();
  const nextGameweek = events.find(event => event.id === gameweekNumber);
  
  // Add logging
  console.log('Getting next gameweek date:', {
    gameweekNumber,
    deadline_time: nextGameweek?.deadline_time,
    date: nextGameweek ? new Date(nextGameweek.deadline_time) : null
  });
  
  return nextGameweek ? new Date(nextGameweek.deadline_time) : null;
}

export async function initializeGameweek(gameweek: number, client: any) {
  // Get the first match's kickoff time for this gameweek
  const fixtures = await fetchFixtures() as FPLFixture[];
  const gameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  
  if (gameweekFixtures.length === 0) {
    console.log(`No fixtures found for gameweek ${gameweek}`);
    return;
  }
  
  // Sort fixtures by kickoff time
  const sortedFixtures = [...gameweekFixtures].sort((a, b) => 
    new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
  );
  
  const startDate = new Date(sortedFixtures[0].kickoff_time);
  const lastMatch = sortedFixtures[sortedFixtures.length - 1];
  const endDate = new Date(new Date(lastMatch.kickoff_time).getTime() + 4 * 60 * 60 * 1000);

  console.log(`Initializing gameweek ${gameweek} with dates:`, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  const { rows } = await client.query(`
    INSERT INTO gameweeks (gameweek_number, points_calculated, total_bets, total_players, top_score, start_date, end_date)
    VALUES ($1, false, 0, 0, 0, $2, $3)
    ON CONFLICT (gameweek_number) DO NOTHING
    RETURNING *
  `, [gameweek, startDate, endDate]);

  if (rows.length > 0) {
    console.log(`Initialized gameweek ${gameweek}`);
  } else {
    console.log(`Gameweek ${gameweek} already exists`);
  }
}

// Add this function near the top of the file
async function updateGameweekDates(gameweek: number, matches: CachedMatchData[], client: any) {
  // Sort matches by kickoff time to ensure we get the actual first match
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
  );
  
  // Add detailed logging
  console.log('Gameweek dates debug:');
  console.log('All matches:', matches.map(m => ({
    kickoff: new Date(m.kickoff_time).toISOString(),
    deadline: new Date(m.deadline).toISOString()
  })));
  console.log('Sorted matches:', sortedMatches.map(m => ({
    kickoff: new Date(m.kickoff_time).toISOString(),
    deadline: new Date(m.deadline).toISOString()
  })));
  
  const startDate = new Date(sortedMatches[0].kickoff_time);
  const lastMatch = matches.reduce((latest, match) => 
    match.kickoff_time > latest.kickoff_time ? match : latest
  , matches[0]);
  const endDate = new Date(new Date(lastMatch.kickoff_time).getTime() + 4 * 60 * 60 * 1000);

  console.log('Selected dates:');
  console.log('Start date:', startDate.toISOString());
  console.log('End date:', endDate.toISOString());

  await client.query(`
    INSERT INTO gameweeks (gameweek_number, start_date, end_date)
    VALUES ($1, $2, $3)
    ON CONFLICT (gameweek_number) 
    DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date
  `, [gameweek, startDate, endDate]);

  console.log(`Updated gameweek ${gameweek} dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
}

function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return d1.getTime() - d2.getTime();
}

// Add this new function to get the end date of the previous gameweek
async function getPreviousGameweekEndDate(currentGameweek: number): Promise<Date | null> {
  if (currentGameweek <= 1) return null;

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT end_date FROM gameweeks WHERE gameweek_number = $1', [currentGameweek - 1]);
    return rows.length > 0 ? new Date(rows[0].end_date) : null;
  } finally {
    client.release();
  }
}

async function verifyAndFixPoints(client: any): Promise<void> {
  // Only updates bets that haven't received points yet
  const { rows: fixedPoints } = await client.query(`
    WITH missing_points AS (
      SELECT b.id, b."matchId", b.fid
      FROM bets b
      JOIN matches m ON b."matchId" = m.id
      WHERE m.is_finished = true
      AND m.result IS NOT NULL
      AND b.prediction = m.result
      AND COALESCE(b.points_earned, 0) = 0
    )
    UPDATE bets b
    SET points_earned = $1
    FROM missing_points mp
    WHERE b.id = mp.id
  `, [CORRECT_PREDICTION_POINTS]);
}


import pool from './db';
import { User } from './types';
import sharp from 'sharp';
import { ImgurClient } from 'imgur';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/farcasterUtils';
import { fetchTeams, fetchFixtures } from '@/lib/api';

// Initialize the Imgur client
const client = new ImgurClient({
  clientId: process.env.IMGUR_CLIENT_ID
});

export async function getOrUpdateUser(fid: number, display_name: string): Promise<User | null> {
  if (!fid || isNaN(fid)) {
    throw new Error('Invalid fid provided');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM users WHERE fid = $1', [fid]);
    
    if (rows.length === 0) {
      // User doesn't exist, create new user with Beta Tester title
      const newUser = await client.query(`
        WITH title_ids AS (
          SELECT id FROM titles WHERE name IN ('New Player', 'Beta Tester')
        )
        INSERT INTO users (fid, display_name, available_titles, title, last_played)
        VALUES ($1, $2, ARRAY(SELECT id FROM title_ids), 'Beta Tester', NOW())
        RETURNING *
      `, [fid, display_name]);

      await client.query('COMMIT');
      return newUser.rows[0];
    }

    // User exists, update if necessary
    if (rows[0].display_name !== display_name) {
      const updatedUser = await client.query(`
        UPDATE users
        SET display_name = $2, last_played = NOW()
        WHERE fid = $1
        RETURNING *
      `, [fid, display_name]);

      await client.query('COMMIT');
      return updatedUser.rows[0];
    }

    // User exists and no update needed
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function addTitleToUser(fid: number, titleName: string): Promise<void> {
  await pool.query(`
    UPDATE users
    SET available_titles = array_append(available_titles, (SELECT id FROM titles WHERE name = $2))
    WHERE fid = $1 AND NOT ((SELECT id FROM titles WHERE name = $2) = ANY(available_titles))
  `, [fid, titleName]);
}

export async function setUserTitle(fid: number, titleName: string): Promise<void> {
  await pool.query(`
    UPDATE users
    SET title = $2
    WHERE fid = $1 AND (SELECT id FROM titles WHERE name = $2) = ANY(available_titles)
  `, [fid, titleName]);
}

export async function removeTitleFromUser(fid: number, titleName: string): Promise<void> {
  await pool.query(`
    UPDATE users
    SET available_titles = array_remove(available_titles, (SELECT id FROM titles WHERE name = $2)),
        title = CASE 
                  WHEN title = $2 THEN 'New Player'
                  ELSE title
                END
    WHERE fid = $1
  `, [fid, titleName]);
}

export async function isNewUser(fid: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT last_played FROM users WHERE fid = $1', [fid]);
  return rows.length === 0 || rows[0].last_played === null;
}

export async function getUserProfile(fid: number): Promise<User | null> {
  const { rows } = await pool.query(`
    SELECT u.*, t.name as title_name
    FROM users u
    LEFT JOIN titles t ON t.name = u.title
    WHERE u.fid = $1
  `, [fid]);
  return rows.length > 0 ? rows[0] : null;
}

export async function convertImageToPng(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pngBuffer = await sharp(buffer).png().toBuffer();
    
    const base64Image = pngBuffer.toString('base64');
    const uploadResponse = await client.upload({
      image: base64Image,
      type: 'base64',
    });

    if (uploadResponse.success && uploadResponse.data) {
      return uploadResponse.data.link;
    } else {
      return url; // Return original URL if upload fails
    }
  } catch (error) {
    console.error('Error in convertImageToPng:', error);
    return url; // Return original URL if conversion or upload fails
  }
}

export async function getOrCreateUser(
  fid: number, 
  display_name: string, 
  pfp_url?: string, 
  username?: string
): Promise<User> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user and titles in a single query
    const { rows } = await client.query(`
      WITH available_titles AS (
        SELECT name 
        FROM titles 
        WHERE name = 'Beta Tester' 
        AND (
          is_limited_time = FALSE 
          OR (is_limited_time = TRUE AND expiration_date > NOW())
        )
      )
      SELECT 
        u.*,
        array_agg(available_titles.name) as available_title_names
      FROM users u
      LEFT JOIN available_titles ON true
      WHERE u.fid = $1
      GROUP BY 
        u.fid, 
        u.display_name, 
        u.username,
        u.title, 
        u.available_titles, 
        u.xp,
        u.level, 
        u.total_gameweeks_played,
        u.perfect_score,
        u.last_played,
        u.pfp_url
    `, [fid]);

    if (rows.length === 0) {
      // User doesn't exist, create new user
      let convertedPfpUrl = pfp_url || DEFAULT_PROFILE_PICTURE;
      if (convertedPfpUrl && convertedPfpUrl.toLowerCase().endsWith('.gif')) {
        try {
          convertedPfpUrl = await convertImageToPng(convertedPfpUrl);
        } catch (error) {
          console.error('Error converting GIF image:', error);
          convertedPfpUrl = DEFAULT_PROFILE_PICTURE;
        }
      }

      const defaultTitle = rows[0]?.available_title_names?.includes('Beta Tester') 
        ? 'Beta Tester' 
        : 'New Player';

      const availableTitles = rows[0]?.available_title_names?.includes('Beta Tester')
        ? ['New Player', 'Beta Tester']
        : ['New Player'];

      // Build insert query dynamically
      const fields = [
        'fid',
        'display_name',
        ...(username ? ['username'] : []),
        'title',
        'available_titles',
        'xp',
        'level',
        'total_gameweeks_played',
        'perfect_score',
        'last_played',
        'pfp_url'
      ];

      const values = [
        fid,
        display_name,
        ...(username ? [username] : []),
        defaultTitle,
        availableTitles,
        0,
        1,
        0,
        0,
        'NOW()',
        convertedPfpUrl
      ].filter(v => v !== 'NOW()');

      const placeholders = values.map((_, i) => `$${i + 1}`);
      const lastPlaceholder = placeholders.length + 1;

      const newUser = await client.query(`
        INSERT INTO users (${fields.join(', ')}, last_played)
        VALUES (${placeholders.join(', ')}, NOW())
        RETURNING *
      `, values);

      await client.query('COMMIT');
      return newUser.rows[0];
    }

    // User exists, update if necessary
    const existingUser = rows[0];
    let needsUpdate = false;
    let updateFields = [];
    let updateValues = [];

    if (existingUser.display_name !== display_name) {
      needsUpdate = true;
      updateFields.push('display_name = $1');
      updateValues.push(display_name);
    }

    if (username && existingUser.username !== username) {
      needsUpdate = true;
      updateFields.push(`username = $${updateValues.length + 1}`);
      updateValues.push(username);
    }

    if (pfp_url && pfp_url !== existingUser.pfp_url) {
      let convertedPfpUrl = pfp_url;
      if (pfp_url.toLowerCase().endsWith('.gif')) {
        try {
          convertedPfpUrl = await convertImageToPng(pfp_url);
        } catch (error) {
          console.error('Error converting GIF image:', error);
          convertedPfpUrl = DEFAULT_PROFILE_PICTURE;
        }
      }
      needsUpdate = true;
      updateFields.push(`pfp_url = $${updateValues.length + 1}`);
      updateValues.push(convertedPfpUrl);
    }

    if (needsUpdate) {
      updateFields.push('last_played = NOW()');
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE fid = $${updateValues.length + 1}
        RETURNING *
      `;
      updateValues.push(fid);

      const updatedUser = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');
      return updatedUser.rows[0];
    }

    await client.query('COMMIT');
    return existingUser;
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error in getOrCreateUser:', e);
    throw e;
  } finally {
    client.release();
  }
}

export async function checkUserExists(fid: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE fid = $1', [fid]);
  return rows.length > 0;
}

export async function getUserTitle(fid: number): Promise<string> {
  const { rows } = await pool.query('SELECT title FROM users WHERE fid = $1', [fid]);
  return rows[0]?.title || 'New Player';
}

export async function getUserLevel(fid: number): Promise<number> {
  const { level } = await getUserLevelAndXP(fid);
  return level;
}

export async function getUserLevelAndXP(fid: number): Promise<{ level: number; xp: number }> {
  const { rows } = await pool.query('SELECT level, xp FROM users WHERE fid = $1', [fid]);
  return {
    level: rows[0]?.level || 1,
    xp: rows[0]?.xp || 0
  };
}

export async function getLeaderboard(limit: number = 5): Promise<User[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT 
        fid,
        display_name,
        title,
        xp,
        level,
        total_gameweeks_played,
        pfp_url
      FROM users
      ORDER BY xp DESC, total_gameweeks_played DESC
      LIMIT $1
    `, [limit]);

    return rows;
  } finally {
    client.release();
  }
}

export async function getUserStats(fid: number): Promise<{
  totalBets: number;
  correctPredictions: number;
  rank: number;
  winRate: number;
  totalGameweeksPlayed: number;
  perfectScore: number;
}> {
  const client = await pool.connect();
  try {
    // Combine the first two queries into one
    const { rows: [userData] } = await client.query(`
      WITH bet_stats AS (
        SELECT 
          COUNT(*) as total_bets,
          COUNT(CASE WHEN points_earned > 0 THEN 1 END) as correct_predictions
        FROM bets
        WHERE fid = $1
      ),
      user_data AS (
        SELECT 
          total_gameweeks_played,
          perfect_score
        FROM users
        WHERE fid = $1
      )
      SELECT 
        bet_stats.*,
        user_data.total_gameweeks_played,
        user_data.perfect_score
      FROM bet_stats, user_data
    `, [fid]);

    // Get rank in a separate query since it needs window function
    const { rows: [rankData] } = await client.query(`
      WITH user_rankings AS (
        SELECT 
          fid,
          RANK() OVER (
            ORDER BY 
              level DESC,
              xp DESC,
              perfect_score DESC,
              total_gameweeks_played DESC
          ) as rank
        FROM users
      )
      SELECT rank
      FROM user_rankings
      WHERE fid = $1
    `, [fid]);

    const totalBets = parseInt(userData.total_bets);
    const correctPredictions = parseInt(userData.correct_predictions);
    const winRate = totalBets > 0 ? Math.round((correctPredictions / totalBets) * 100) : 0;

    return {
      totalBets,
      correctPredictions,
      rank: parseInt(rankData?.rank || '0'),
      winRate,
      totalGameweeksPlayed: userData.total_gameweeks_played || 0,
      perfectScore: userData.perfect_score || 0
    };
  } finally {
    client.release();
  }
}

export async function getPreviousGameweekBets(fid: number, currentGameweek: number): Promise<{
  gameweek: number;
  bets: {
    teamName: string;
    prediction: string;
    wasCorrect: boolean;
  }[];
}[]> {
  const client = await pool.connect();
  try {
    // First get the completed gameweeks where user has placed bets
    const { rows: completedGameweeks } = await client.query(`
      WITH user_gameweeks AS (
        SELECT DISTINCT b.gameweek
        FROM bets b
        WHERE b.fid = $1
        AND b.gameweek <= $2
        ORDER BY b.gameweek DESC
        LIMIT 3
      )
      SELECT 
        ug.gameweek,
        g.points_calculated
      FROM user_gameweeks ug
      LEFT JOIN gameweeks g ON g.gameweek_number = ug.gameweek
      WHERE g.points_calculated = true
      ORDER BY ug.gameweek DESC
      LIMIT 2
    `, [fid, currentGameweek]);

    if (completedGameweeks.length === 0) {
      return [];
    }

    // Get bets for the completed gameweeks
    const gameweekNumbers = completedGameweeks.map(gw => gw.gameweek);
    const { rows: bets } = await client.query(`
      SELECT 
        b.gameweek,
        b.prediction,
        b.points_earned,
        m.result,
        m.external_id,
        m.id as match_id
      FROM bets b
      JOIN matches m ON b."matchId" = m.id
      WHERE b.fid = $1 
      AND b.gameweek = ANY($2)
      ORDER BY b.gameweek DESC, m.kickoff_time DESC
    `, [fid, gameweekNumbers]);

    // Fetch fixtures and teams
    const fixturesResponse = await fetchFixtures();
    const fixtures = Array.isArray(fixturesResponse) ? fixturesResponse : [fixturesResponse];
    const { teams } = await fetchTeams();

    type GameweekData = {
      gameweek: number;
      bets: Array<{
        teamName: string;
        prediction: string;
        wasCorrect: boolean;
      }>;
    };

    // Process the bets by gameweek
    const gameweekBets = gameweekNumbers.reduce((acc: GameweekData[], gameweekNumber) => {
      const gameweekBets = bets.filter(bet => bet.gameweek === gameweekNumber);
      
      if (gameweekBets.length > 0) {
        const processedBets = gameweekBets.map(bet => {
          const fixture = fixtures.find(f => f.id.toString() === bet.external_id);
          if (fixture) {
            const homeTeam = teams.find(t => t.id === fixture.team_h);
            const awayTeam = teams.find(t => t.id === fixture.team_a);

            if (homeTeam && awayTeam) {
              return {
                teamName: bet.prediction === '1' ? homeTeam.name : 
                         bet.prediction === '2' ? awayTeam.name : 'Draw',
                prediction: bet.prediction === '1' ? 'Win' :
                           bet.prediction === '2' ? 'Win' : 'Draw',
                wasCorrect: bet.points_earned > 0
              };
            }
          }
          return null;
        }).filter((bet): bet is NonNullable<typeof bet> => bet !== null);

        if (processedBets.length > 0) {
          acc.push({
            gameweek: gameweekNumber,
            bets: processedBets
          });
        }
      }

      return acc;
    }, []);

    return gameweekBets;
  } finally {
    client.release();
  }
}

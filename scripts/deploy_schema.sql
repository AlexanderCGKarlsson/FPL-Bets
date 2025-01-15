-- Start a transaction
BEGIN;

-- Step 1: Create the users table first
CREATE TABLE IF NOT EXISTS users (
    fid INTEGER PRIMARY KEY,
    display_name TEXT,
    username TEXT,
    title TEXT DEFAULT 'New Player',
    available_titles TEXT[] DEFAULT ARRAY['New Player'],
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_gameweeks_played INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE,
    pfp_url TEXT,
    perfect_score INTEGER DEFAULT 0
);

-- Step 2: Create the matches table
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    kickoff_time TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    gameweek INTEGER,
    is_finished BOOLEAN DEFAULT FALSE,
    result CHAR(1)
);

-- Step 3: Create the bets table
CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    fid INTEGER REFERENCES users(fid),
    "matchId" TEXT REFERENCES matches(id),
    gameweek INTEGER,
    prediction CHAR(1),
    points_earned INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_x2 BOOLEAN DEFAULT FALSE
);

-- Add this line after creating the bets table
ALTER TABLE bets ADD CONSTRAINT unique_fid_matchId UNIQUE (fid, "matchId");

-- Step 4: Create the gameweeks table
CREATE TABLE IF NOT EXISTS gameweeks (
    id SERIAL PRIMARY KEY,
    gameweek_number INTEGER NOT NULL UNIQUE,
    points_calculated BOOLEAN DEFAULT FALSE,
    total_bets INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    top_score INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
);

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_gameweek_number ON gameweeks(gameweek_number);
CREATE INDEX IF NOT EXISTS idx_bets_gameweek ON bets(gameweek);

-- Step 6: Add a trigger to update total_gameweeks_played in users table
CREATE OR REPLACE FUNCTION update_total_gameweeks_played()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_gameweeks_played = (
        SELECT COUNT(DISTINCT gameweek)
        FROM bets
        WHERE fid = NEW.fid
    )
    WHERE fid = NEW.fid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_gameweeks_played
AFTER INSERT OR UPDATE ON bets
FOR EACH ROW
EXECUTE FUNCTION update_total_gameweeks_played();

-- Step 7: Add a function to initialize or update gameweek data
CREATE OR REPLACE FUNCTION initialize_or_update_gameweek(gw_number INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO gameweeks (gameweek_number)
    VALUES (gw_number)
    ON CONFLICT (gameweek_number) 
    DO UPDATE SET
        total_bets = (SELECT COUNT(*) FROM bets WHERE gameweek = gw_number),
        total_players = (SELECT COUNT(DISTINCT fid) FROM bets WHERE gameweek = gw_number);
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add a trigger to automatically initialize gameweek data when a new bet is placed
CREATE OR REPLACE FUNCTION ensure_gameweek_exists()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_or_update_gameweek(NEW.gameweek);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_gameweek_data
BEFORE INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION ensure_gameweek_exists();

-- Create a new "titles" table
CREATE TABLE IF NOT EXISTS titles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_limited_time BOOLEAN DEFAULT FALSE,
    expiration_date TIMESTAMP WITH TIME ZONE
);

-- Add some initial titles
INSERT INTO titles (name, is_limited_time, expiration_date) VALUES
('New Player', FALSE, NULL),
('Beta Tester', TRUE, '2024-03-31 23:59:59+00') -- Set an appropriate end date for the beta period
ON CONFLICT (name) DO NOTHING;

-- Add this to your schema
CREATE TABLE IF NOT EXISTS perfect_scores (
    id SERIAL PRIMARY KEY,
    fid INTEGER NOT NULL,
    gameweek INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fid, gameweek)
);

-- Commit the transaction
COMMIT;

export const DEADLINE_OFFSET_MINUTES = 60; // minutes before deadline closes.
export const BIG_TEAMS = ['Arsenal', 'Liverpool', 'Man Utd', 'Man City', 'Spurs', 'Chelsea'];
export const MATCHES_TO_FETCH = 3; // Or whatever number you prefer
export const CORRECT_PREDICTION_POINTS = 1;
export const DAYS_BEFORE_GAMEWEEK_VISIBLE = 3; // Number of days before a gameweek starts that it becomes visible
export const DOC_URL = 'https://farcaster-fl-bets-doc.vercel.app/';

export const BYPASS_CACHE = process.env.NODE_ENV === 'development' && process.env.BYPASS_CACHE === 'true';

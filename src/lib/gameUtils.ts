import { CachedMatchData } from './types';
import pool from './db';
import { DAYS_BEFORE_GAMEWEEK_VISIBLE, DEADLINE_OFFSET_MINUTES } from './constants';

function formatDate(date: Date): string {
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

/**
 * Checks if betting is open for a gameweek
 */
export async function isGameweekOpen(gameweek: number): Promise<{
  isOpen: boolean;
  message?: string;
}> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT start_date, end_date FROM gameweeks WHERE gameweek_number = $1',
      [gameweek]
    );
    
    if (rows.length === 0) {
      return { isOpen: false, message: "Gameweek not found" };
    }
    
    const now = new Date();
    const gameweekStart = new Date(rows[0].start_date);
    const gameweekEnd = new Date(rows[0].end_date);
    const visibilityThreshold = new Date(gameweekStart);
    visibilityThreshold.setDate(visibilityThreshold.getDate() - DAYS_BEFORE_GAMEWEEK_VISIBLE);

    if (now > gameweekEnd) {
      return {
        isOpen: false,
        message: "Thanks for playing! The betting for this gameweek is over. We are calculating the points and preparing for the next gameweek."
      };
    }

    if (now < visibilityThreshold) {
      return {
        isOpen: false,
        message: `Betting will be available on ${formatDate(visibilityThreshold)}.`
      };
    }

    return { isOpen: true };
  } finally {
    client.release();
  }
}

/**
 * Gets the deadline for a match
 */
export function getMatchDeadline(match: CachedMatchData): Date {
  const kickoff_time = new Date(match.kickoff_time);
  return new Date(kickoff_time.getTime() - DEADLINE_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Finds the next available match that can be bet on
 */
export function findNextAvailableMatch(matches: CachedMatchData[], currentIndex: number): number {
  const now = new Date();

  for (let i = currentIndex; i < matches.length; i++) {
    const match = matches[i];
    const kickoff_time = new Date(match.kickoff_time);
    const deadline = new Date(kickoff_time.getTime() - DEADLINE_OFFSET_MINUTES * 60 * 1000);

    if (now < deadline) {
      return i;
    }
  }

  return -1;
}

/**
 * Checks if a match is within its betting window
 */
export function isMatchBettingOpen(match: CachedMatchData): boolean {
  const now = new Date();
  const deadline = getMatchDeadline(match);
  return now < deadline;
}

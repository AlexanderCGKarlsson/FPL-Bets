import { CachedMatchData } from './types';
import { DEADLINE_OFFSET_MINUTES } from './constants';

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

export function getMatchDeadline(match: CachedMatchData): Date {
  const kickoff_time = new Date(match.kickoff_time);
  return new Date(kickoff_time.getTime() - DEADLINE_OFFSET_MINUTES * 60 * 1000);
}

export function isMatchBettingOpen(match: CachedMatchData): boolean {
  const now = new Date();
  const deadline = getMatchDeadline(match);
  return now < deadline;
}

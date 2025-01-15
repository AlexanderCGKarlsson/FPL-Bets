export interface FPLFixture {
    id: number;
    event: number;
    kickoff_time: string;
    team_h: number;
    team_a: number;
    finished: boolean;
    finished_provisional: boolean;
    team_h_score: number | null;
    team_a_score: number | null;
    started: boolean;
    minutes: number;
}

export interface FPLEvent {
    id: number;
    deadline_time: string;
    // Add other necessary properties
}

export interface FPLTeam {
    id: number;
    name: string;
    short_name: string;
    logoUrl: string;
    strength_overall_home: number;
    strength_overall_away: number;
}

export interface MatchData {
    id: string;
    external_id: string;
    kickoff_time: Date;
    deadline: Date;
    gameweek: number;
    is_finished: boolean;
    result: '1' | 'X' | '2' | null;
}

export type CachedMatchData = {
    id: string;
    external_id: string;
    kickoff_time: Date;
    deadline: Date;
    gameweek: number;
    is_finished: boolean;
    result: '1' | 'X' | '2' | null;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamLogo: string;
    awayTeamLogo: string;
    homeScore?: number;
    awayScore?: number;
    isLive?: boolean;
    minute?: number;
};

export interface Bet {
    id: number;
    fid: number;
    matchId: string;
    prediction: '1' | 'X' | '2';
    points_earned: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface User {
    fid: number;
    display_name: string;
    title: string;
    available_titles: string[];
    xp: number;
    level: number;
    total_gameweeks_played: number;
    perfect_score: number;
    last_played: Date;
    pfp_url?: string;
}

export interface FarcasterUser {
    fid: number;
    display_name: string;
    pfp_url: string;
    verifiedAddress: string;
}

export interface FormattedBet {
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo: string;
    awayTeamLogo: string;
    matchDate: string;
    matchDeadline: string;
    prediction: '1' | 'X' | '2' | 'Not bet';
    is_x2: boolean;
}

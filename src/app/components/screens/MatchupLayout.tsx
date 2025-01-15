import React from 'react';
import { UserHeader, GameweekHeader, DeadlineDisplay, TeamVS } from './LayoutComponents';

type MatchupLayoutProps = {
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  gameweek: string;
  kickoff_time: string; // This will be an ISO string
  deadline: string; // This will be an ISO string
  display_name: string;
  pfp_url: string;
  userTitle: string;
  level: number;
  xp: number;
  isNewUser?: boolean;
};

export const MatchupLayout: React.FC<MatchupLayoutProps> = ({ 
  homeTeam,
  awayTeam,
  homeTeamLogo,
  awayTeamLogo,
  gameweek,
  kickoff_time,
  deadline,
  display_name,
  pfp_url,
  userTitle,
  level,
  xp,
  isNewUser = false
}) => {
  const formatLocalTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDeadline = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '24px', backgroundColor: 'rgba(15, 23, 42, 1)', borderRadius: '24px' }}>
      <UserHeader
        display_name={display_name}
        userTitle={userTitle}
        pfp_url={pfp_url}
        level={isNewUser ? -1 : level}
        xp={xp}
      />
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(31, 41, 55, 1)',
        borderRadius: '24px',
        padding: '32px',
        flex: 1,
        marginTop: '24px'
      }}>
        <GameweekHeader gameweek={gameweek} kickoff_time={formatLocalTime(kickoff_time)} />
        
        <TeamVS
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeTeamLogo={homeTeamLogo}
          awayTeamLogo={awayTeamLogo}
        />
        
        <DeadlineDisplay deadline={formatDeadline(deadline)} />
      </div>
    </div>
  );
};

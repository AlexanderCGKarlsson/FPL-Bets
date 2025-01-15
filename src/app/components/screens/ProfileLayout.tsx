import React from 'react';

type GameweekBets = {
  gameweek: number;
  bets: Array<{
    teamName: string;
    prediction: string;
    wasCorrect: boolean;
  }>;
};

type ProfileLayoutProps = {
  displayName: string;
  pfp_url: string;
  userTitle: string;
  level: number;
  xp: number;
  totalBets: number;
  correctPredictions: number;
  rank: number;
  winRate: number;
  perfectScores: number;
  previousBets: GameweekBets[];
};

function getDynamicFontSize(text: string): number {
  if (text.length > 25) return 28;
  if (text.length > 20) return 32;
  return 38;
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  displayName,
  pfp_url,
  userTitle,
  level,
  xp,
  totalBets,
  correctPredictions,
  rank,
  winRate,
  perfectScores,
  previousBets = [],
}) => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    width: '100%', 
    height: '100%', 
    padding: '32px', 
    backgroundColor: '#0f172a', 
    color: 'white', 
    fontFamily: 'sans-serif' 
  }}>
    <div style={{ 
      display: 'flex',
      backgroundColor: '#1e293b', 
      borderRadius: '24px', 
      padding: '32px',
      flex: 1,
    }}>
      {/* Left section - Profile info */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '24px' }}>
        {/* Profile header */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <img 
            src={pfp_url}
            alt={displayName}
            width={100}
            height={100}
            style={{ borderRadius: '20px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '16px'
            }}>
              <span style={{ 
                fontSize: `${getDynamicFontSize(displayName)}px`, 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {displayName}
              </span>
              <div style={{ 
                display: 'flex', 
                gap: '16px',
                backgroundColor: '#334155',
                padding: '8px 16px',
                borderRadius: '12px',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '22px' }}>Level {level}</span>
                <span style={{ color: '#94a3b8' }}>|</span>
                <span style={{ fontSize: '22px' }}>{xp} XP</span>
              </div>
            </div>
            <span style={{ fontSize: '22px', color: '#94a3b8' }}>{userTitle}</span>
          </div>
        </div>

        {/* Previous gameweek section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#0f172a',
          padding: '20px',
          borderRadius: '16px'
        }}>
          {previousBets && previousBets.length > 0 ? (
            previousBets.map((gameweekData, gwIndex) => (
              <div key={gwIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#94a3b8' }}>
                  Gameweek {gameweekData.gameweek}
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {gameweekData.bets.map((bet, betIndex) => (
                    <div key={betIndex} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      backgroundColor: '#1e293b',
                      padding: '12px',
                      borderRadius: '12px',
                      minWidth: '100px'
                    }}>
                      <span style={{ fontSize: '20px', color: '#94a3b8' }}>{bet.teamName}</span>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {bet.prediction} {bet.wasCorrect ? '✅' : '❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: '#1e293b',
              padding: '12px',
              borderRadius: '12px',
              color: '#94a3b8'
            }}>
              No completed gameweeks found
            </div>
          )}
        </div>
      </div>

      {/* Right section - Stats */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '24px',
        borderLeft: '2px solid #334155',
        paddingLeft: '32px',
        marginLeft: '32px',
        justifyContent: 'center'
      }}>
        <StatItem emoji="🏆" value={`#${rank}`} label="Rank" />
        <StatItem emoji="🎯" value={`${winRate}%`} label="Win Rate" />
        <StatItem emoji="🎮" value={totalBets} label="Total Bets" />
        <StatItem emoji="✨" value={correctPredictions} label="Correct" />
        <StatItem emoji="🎲" value={perfectScores} label="Perfect Score" />
      </div>
    </div>
  </div>
);

const StatItem: React.FC<{ emoji: string; value: string | number; label: string }> = ({ emoji, value, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    <span style={{ fontSize: '32px' }}>{emoji}</span>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</span>
      <span style={{ fontSize: '16px', color: '#94a3b8' }}>{label}</span>
    </div>
  </div>
);
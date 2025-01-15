import React from 'react';

type Bet = {
  homeTeam: string;
  awayTeam: string;
  prediction: '1' | 'X' | '2' | 'Not bet';
  matchDate: string;
  matchDeadline: string;
};

type BetOverviewLayoutProps = {
  displayName: string;
  pfp_url: string;
  userTitle: string;
  score: number;
  gameweek: string;
  bets: Bet[];
  level: number;
  xp: number;
};

export const BetOverviewLayout: React.FC<BetOverviewLayoutProps> = ({
  displayName,
  pfp_url,
  userTitle,
  score,
  gameweek,
  bets,
  level,
  xp,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '24px', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '48px', 
          height: '48px', 
          borderRadius: '20px', 
          overflow: 'hidden', 
          marginRight: '12px',
          backgroundColor: '#334155'
        }}>
          {pfp_url && <img src={pfp_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: '22px', fontWeight: 'bold' }}>{displayName}</div>
          <div style={{ display: 'flex', fontSize: '20px', color: '#94a3b8' }}>{userTitle}</div>
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#1e293b', 
        borderRadius: '8px',
        padding: '6px 12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 'bold' }}>
          <span>⭐️ LVL: {level}</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>✨ XP: {xp}</span>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
      <div style={{ display: 'flex', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
        These are your current bets in Gameweek {gameweek}
      </div>
    </div>

    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1e293b', 
      borderRadius: '16px', 
      padding: '20px',
      flex: 1,
      justifyContent: 'space-between'
    }}>
      {bets.map((bet, index) => (
        <div key={index} style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#334155', 
          borderRadius: '12px', 
          padding: '16px',
          marginBottom: index === bets.length - 1 ? '0' : '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ display: 'flex', fontSize: '26px', fontWeight: 'bold', marginBottom: '6px' }}>{bet.homeTeam} vs {bet.awayTeam}</span>
            <span style={{ display: 'flex', fontSize: '20px', color: '#60a5fa' }}>
            Deadline: {bet.matchDeadline}
            </span>
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '22px', 
            fontWeight: 'bold', 
            padding: '10px 16px', 
            borderRadius: '8px',
            backgroundColor: bet.prediction === 'Not bet' ? '#64748b' : '#475569',
            minWidth: '100px',
            height: '100%'
          }}>
            {bet.prediction === '1' ? bet.homeTeam : 
             bet.prediction === '2' ? bet.awayTeam : 
             bet.prediction === 'X' ? 'Draw' : 'Not bet'}
          </div>
        </div>
      ))}
    </div>
  </div>
);
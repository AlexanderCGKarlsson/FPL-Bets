import React from 'react';

export const Container: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '24px',
    backgroundColor: 'rgba(15, 23, 42, 1)',
    borderRadius: '24px',
    ...style
  }}>
    {children}
  </div>
);

export const UserHeader: React.FC<{ 
    display_name: string | null | undefined; 
    userTitle?: string; 
    pfp_url: string; 
    level: number;
    xp: number;
  }> = ({
    display_name,
    userTitle,
    pfp_url,
    level,
    xp
  }) => {
    const displayName = display_name && display_name !== "null" ? display_name : 'Stranger';
    const displayTitle = userTitle || "New Player";
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '80px', 
            height: '80px', 
            borderRadius: '40px', 
            marginRight: '16px',
            overflow: 'hidden'
          }}>
            <img src={pfp_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)' }}>{displayName}</div>
            <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>{displayTitle}</div>
          </div>
        </div>
        {level >= 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: 'rgba(31, 41, 55, 1)', 
              borderRadius: '24px',
              padding: '12px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)' }}>
                <span>⭐️ LVL: {level}</span>
                <span style={{ color: 'rgba(148, 163, 184, 1)' }}>|</span>
                <span>✨ XP: {xp}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

export const Title: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
    <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', marginBottom: '16px', textAlign: 'center' }}>
      ⚽️ {title}
    </h1>
    <p style={{ fontSize: '28px', color: 'rgba(96, 165, 250, 1)', marginTop: 0, textAlign: 'center' }}>{subtitle}</p>
  </div>
);

export const FeatureBox: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 41, 55, 1)',
    padding: '24px',
    borderRadius: '16px',
    width: '30%',
    aspectRatio: '1 / 1',
    border: '2px solid rgba(96, 165, 250, 0.3)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  }}>
    <span style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</span>
    <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: 'rgba(255, 255, 255, 1)', textAlign: 'center' }}>{title}</h3>
    <p style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)', margin: '10px 0 0', textAlign: 'center' }}>
      {description}
    </p>
  </div>
);

export const FeatureBoxes: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '32px' }}>
    <FeatureBox icon="👥" title="Social" description="Bet with friends" />
    <FeatureBox icon="🏆" title="Premier League" description="Top football action" />
    <FeatureBox icon="🌐" title="Web3 Native" description="On Farcaster" />
  </div>
);

export const Tagline: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 'auto' }}>
    <p style={{ fontSize: '28px', color: 'rgba(255, 255, 255, 1)', textAlign: 'center', fontWeight: 'bold' }}>{text}</p>
  </div>
);

export const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 41, 55, 1)',
    borderRadius: '24px', // Increased border radius for rounder appearance
    padding: '24px',
    width: '160px', // Fixed width for consistent size
    height: '160px', // Fixed height for consistent size
    border: '2px solid rgba(96, 165, 250, 0.3)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    margin: '0 12px', // Added margin for spacing between boxes
  }}>
    <div style={{ 
      display: 'flex',
      fontSize: '36px', 
      fontWeight: 'bold', 
      color: 'rgba(255, 255, 255, 1)',
      marginBottom: '12px',
    }}>
      {value}
    </div>
    <div style={{ 
      display: 'flex',
      fontSize: '20px', 
      color: 'rgba(148, 163, 184, 1)',
      textAlign: 'center',
    }}>
      {label}
    </div>
  </div>
);

export const Stats: React.FC<{ totalPlayers: string; totalBets: string; }> = ({ totalPlayers, totalBets }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginBottom: '32px',
  }}>
    <StatBox label="Total Players" value={totalPlayers} />
    <StatBox label="Total Bets" value={totalBets} />
  </div>
);

export const BottomSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    width: '100%',
    padding: '24px',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '16px',
  }}>
    {children}
  </div>
);

export const GameweekHeader: React.FC<{ gameweek: string; kickoff_time: string }> = ({ gameweek, kickoff_time }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
    <div style={{ display: 'flex', fontSize: '30px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', marginBottom: '2px' }}>Gameweek {gameweek}</div>
    <div style={{ display: 'flex', fontSize: '25px', color: 'rgba(255, 255, 255, 1)' }}>{kickoff_time}</div>
  </div>
);

export const DeadlineDisplay: React.FC<{ deadline: string }> = ({ deadline }) => (
  <div style={{ display: 'flex', fontSize: '22px', color: 'rgba(148, 163, 184, 1)' }}>Deadline: {deadline}</div>
);

export const TeamVS: React.FC<{ homeTeam: string; awayTeam: string; homeTeamLogo: string; awayTeamLogo: string }> = ({ homeTeam, awayTeam, homeTeamLogo, awayTeamLogo }) => {
  const renderTeamLogo = (team: string, logo: string) => {
    if (logo) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '115px',
          height: '115px',
          borderRadius: '60px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}>
          <img src={logo} alt={team} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
        </div>
      );
    } else {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '115px',
          height: '115px',
          borderRadius: '60px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          {team.slice(0, 3).toUpperCase()}
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
        {renderTeamLogo(homeTeam, homeTeamLogo)}
        <div style={{ display: 'flex', fontSize: '24px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', textAlign: 'center', marginTop: '2px' }}>{homeTeam}</div>
      </div>
      
      <div style={{ display: 'flex', fontSize: '30px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', width: '40%', justifyContent: 'center' }}>VS</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
        {renderTeamLogo(awayTeam, awayTeamLogo)}
        <div style={{ display: 'flex', fontSize: '28px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', textAlign: 'center', marginTop: '2px' }}>{awayTeam}</div>
      </div>
    </div>
  );
};

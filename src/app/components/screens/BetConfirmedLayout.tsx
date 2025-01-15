import React from 'react';
import { UserHeader } from './LayoutComponents';

type BetConfirmedLayoutProps = {
  team: string;
  xp: number;
  display_name: string;
  pfp_url: string;
  userTitle: string;
  level: number;
  isNewUser?: boolean;
};

export const BetConfirmedLayout: React.FC<BetConfirmedLayoutProps> = ({
  team,
  xp,
  display_name,
  pfp_url,
  userTitle,
  level,
  isNewUser = false,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '24px', backgroundColor: 'rgba(15, 23, 42, 1)', borderRadius: '24px' }}>
    <UserHeader
      display_name={display_name}
      userTitle={userTitle}
      pfp_url={pfp_url}
      level={isNewUser ? -1 : level}
      xp={xp}
    />
    
    {/* Bet confirmation section */}
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(31, 41, 55, 1)',
      borderRadius: '24px',
      padding: '24px',
      flex: 1,
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', fontSize: '28px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 1)', marginBottom: '12px' }}>Bet Confirmed!</div>
      <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '24px', textAlign: 'center' }}>Your bet has been successfully placed.</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', fontSize: '24px', color: 'rgba(255, 255, 255, 1)', marginBottom: '8px' }}>You've placed a bet on:</div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: 'rgba(96, 165, 250, 1)', 
          padding: '12px 24px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          minWidth: '200px'
        }}>
          {team}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>Your new XP total:</div>
        <div style={{ display: 'flex', fontSize: '28px', fontWeight: 'bold', color: 'rgba(96, 165, 250, 1)', marginTop: '8px' }}>{xp} XP</div>
      </div>
    </div>
  </div>
);
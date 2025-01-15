import React from 'react';
import { User } from '@/lib/types';

export interface LeaderboardLayoutProps {
  leaderboard: User[];
}

export const LeaderboardLayout: React.FC<LeaderboardLayoutProps> = ({ leaderboard }) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '20px', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
      <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '5px' }}>🏆 Leaderboard</h1>
    </div>
    
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1e293b', 
      borderRadius: '16px', 
      padding: '16px',
      flex: 1,
    }}>
      {leaderboard.map((user, index) => (
        <div key={user.fid} style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: index % 2 === 0 ? '#334155' : '#1e293b', 
          borderRadius: '12px', 
          padding: '12px',
          marginBottom: index === leaderboard.length - 1 ? '0' : '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', marginRight: '12px', minWidth: '24px' }}>{index + 1}</span>
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              marginRight: '12px',
              backgroundColor: '#2563eb'
            }}>
              {user.pfp_url ? (
                <img 
                  src={user.pfp_url}
                  alt={user.display_name}
                  width={36}
                  height={36}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 36, height: 36, backgroundColor: '#2563eb' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{user.display_name}</span>
              <span style={{ fontSize: '17px', color: '#94a3b8' }}>{user.title}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{user.xp} XP</span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Level {user.level}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

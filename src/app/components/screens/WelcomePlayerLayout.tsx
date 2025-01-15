import React from 'react';
import { Container, UserHeader } from './LayoutComponents';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/farcasterUtils';
import { NEXT_PUBLIC_URL } from '@/app/config';


type Game = {
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  isLive?: boolean;
  isFinished?: boolean;
  started?: boolean;
  minute?: number;
  kickoff_time: Date | string;
};

type WelcomePlayerLayoutProps = {
  display_name: string;
  pfp_url: string;
  userTitle: string;
  score: number;
  currentGameweek: string;
  games: Game[];
  level: number;
  xp: number;
};

export const WelcomePlayerLayout: React.FC<WelcomePlayerLayoutProps> = ({ 
  display_name,
  pfp_url,
  userTitle,
  score,
  currentGameweek,
  games,
  level,
  xp,
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(180deg, #0a1929 0%, #0d2137 100%)',
    color: '#ffffff',
    position: 'relative',
    padding: '32px',
    borderRadius: '32px',
    overflow: 'hidden',
  }}>
    {/* Background pattern */}
    <div
      style={{
        position: 'absolute',
        top: '-100%',
        left: '-100%',
        right: '-100%',
        bottom: '-100%',
        opacity: 0.1,
        backgroundImage: 'radial-gradient(circle at 25px 25px, #ffffff 2%, transparent 0%), radial-gradient(circle at 75px 75px, #ffffff 2%, transparent 0%)',
        backgroundSize: '100px 100px',
        backgroundPosition: 'center center',
        pointerEvents: 'none',
        transform: 'scale(1.5)',
        borderRadius: '32px',
      }}
    />
    
    {/* Radial overlay */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 50%, transparent 0%, #0a1929 100%)',
        opacity: 0.4,
        pointerEvents: 'none',
        borderRadius: '32px',
      }}
    />

    {/* Content container */}
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'relative',
    }}>
      <UserHeader
        display_name={display_name}
        userTitle={userTitle}
        pfp_url={pfp_url}
        level={level}
        xp={xp}
      />
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <h2 style={{ 
          fontSize: '35px',
          color: '#4a90e2',
          textAlign: 'center',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          margin: 0,
        }}>
          Gameweek {currentGameweek}
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '95%',
          maxWidth: '900px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 100%)',
          backdropFilter: 'blur(2px)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid rgba(74, 144, 226, 0.15)',
          gap: '8px',
          boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1)',
        }}>
          {games.map((game, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 24px',
              borderBottom: index === games.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: game.started && !game.isFinished ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
              borderRadius: '8px'
            }}>
              {/* Left side with home team */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '42%',
                gap: '12px'
              }}>
                <img 
                  src={`${NEXT_PUBLIC_URL}/api/teamLogo/${game.homeTeamId}`}
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                />
                <span style={{ 
                  fontSize: '32px',
                  color: '#FFFFFF',
                  textAlign: 'right',
                  fontWeight: '500'
                }}>
                  {game.homeTeam}
                </span>
                {(game.started || game.homeScore !== undefined) && (
                  <span style={{ 
                    fontSize: '32px',
                    color: '#4a90e2',
                    fontWeight: '700'
                  }}>
                    {game.homeScore}
                  </span>
                )}
              </div>

              {/* Center with match status */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '16%',
              }}>
                {game.started && !game.isFinished ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '14px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      animation: 'pulse 2s infinite'
                    }} />
                    <span style={{
                      fontSize: '22px',
                      color: '#22c55e',
                      fontWeight: '600'
                    }}>
                      {game.minute}'
                    </span>
                  </div>
                ) : game.isFinished ? (
                  <span style={{
                    fontSize: '26px',
                    color: '#64748b',
                    fontWeight: '600'
                  }}>
                    FT
                  </span>
                ) : (
                  <span style={{ 
                    fontSize: '26px',
                    color: '#4a90e2',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    vs
                  </span>
                )}
              </div>

              {/* Right side with away team */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                width: '42%',
                gap: '12px'
              }}>
                {(game.started || game.awayScore !== undefined) && (
                  <span style={{ 
                    fontSize: '32px',
                    color: '#4a90e2',
                    fontWeight: '700'
                  }}>
                    {game.awayScore}
                  </span>
                )}
                <span style={{ 
                  fontSize: '32px',
                  color: '#FFFFFF',
                  textAlign: 'left',
                  fontWeight: '500'
                }}>
                  {game.awayTeam}
                </span>
                <img 
                  src={`${NEXT_PUBLIC_URL}/api/teamLogo/${game.awayTeamId}`}
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
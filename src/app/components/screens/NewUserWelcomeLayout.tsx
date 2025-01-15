import React from 'react';
import { UserHeader, Container } from './LayoutComponents';

type NewUserWelcomeLayoutProps = {
  display_name: string;
  pfp_url: string;
  userTitle: string;
};

export const NewUserWelcomeLayout: React.FC<NewUserWelcomeLayoutProps> = ({ 
  display_name,
  pfp_url,
  userTitle,
}) => {

  return (
    <Container style={{ backgroundColor: 'rgb(15, 23, 42)' }}>
      <UserHeader
        display_name={display_name}
        userTitle={userTitle}
        pfp_url={pfp_url}
        level={-1}
        xp={0}
      />
      
      {/* Welcome message container */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgb(31, 41, 55)',
        borderRadius: '16px',
        padding: '32px',
        flex: 1,
        marginTop: '24px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '45px', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
          Hey there, {display_name}! 👋
        </span>
        <span style={{ fontSize: '30px', marginBottom: '16px', color: 'white' }}>
          Welcome to Farcaster Football Bets! ⚽️
        </span>
        <span style={{ fontSize: '25px', maxWidth: '80%', marginBottom: '16px', color: 'rgb(148, 163, 184)' }}>
          Looks like you are new here. You can check the 'How to play' section or just dive into the betting action 🎲!
        </span>
      </div>
    </Container>
  );
};
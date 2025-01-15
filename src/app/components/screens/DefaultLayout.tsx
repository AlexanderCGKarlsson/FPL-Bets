import React from 'react';

type DefaultLayoutProps = {
  title: string;
  subtitle: string;
};

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({ title, subtitle }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px',
        background: 'linear-gradient(180deg, #0a1929 0%, #0d2137 100%)',
        color: '#ffffff',
        fontFamily: 'Roboto',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '32px',
      }}
    >
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
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '48px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: '800', 
            margin: '0',
            color: '#4a90e2',
            letterSpacing: '-1px'
          }}>
            {title}
          </h1>
          <p style={{ 
            fontSize: '28px', 
            color: '#4a90e2', 
            margin: '8px 0 0 0',
            fontWeight: '500',
            opacity: 0.9
          }}>
            {subtitle}
          </p>
        </div>
      </header>
      <main
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '48px',
          flex: 1
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>🎯</span>
              <span style={{ fontSize: '26px', color: '#ffffff', fontWeight: '500' }}>Predict match outcomes and earn exclusive titles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>⭐️</span>
              <span style={{ fontSize: '26px', color: '#ffffff', fontWeight: '500' }}>Level up and compete with friends</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>🏆</span>
              <span style={{ fontSize: '26px', color: '#ffffff', fontWeight: '500' }}>Seasonal rewards and achievements</span>
            </div>
          </div>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '32px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.08) 100%)',
          backdropFilter: 'blur(2px)',
          borderRadius: '16px',
          border: '1px solid rgba(74, 144, 226, 0.15)',
          maxWidth: '480px',
          marginTop: '4px',
          boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ 
            fontSize: '34px',
            textAlign: 'center',
            color: '#4a90e2',
            fontWeight: '700',
            letterSpacing: '-0.5px'
          }}>
            Beta season is Live! 🚀
          </div>
          <div style={{ 
            fontSize: '24px',
            textAlign: 'center',
            color: '#ffffff',
            opacity: 0.9,
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            Join the first season of Premier League predictions and compete for exclusive titles
          </div>
        </div>
      </main>
    </div>
  );
};

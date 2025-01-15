import React from 'react';
import { Container, Title, BottomSection } from './LayoutComponents';

type ErrorLayoutProps = {
  title: string;
  message: string;
  additionalInfo?: string;
};

export const ErrorLayout: React.FC<ErrorLayoutProps> = ({ title, message, additionalInfo }) => (
  <Container>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      backgroundColor: 'rgba(31, 41, 55, 1)',
      borderRadius: '24px',
      padding: '32px',
      marginBottom: '40px', // Add margin at the bottom
    }}>
      <Title title={title} subtitle={message} />
      <div style={{ 
        fontSize: '24px', 
        color: 'rgba(255, 255, 255, 0.8)', 
        marginTop: '24px', 
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: '1.4',
        marginBottom: '24px'
      }}>
        {additionalInfo}
      </div>
    </div>
  </Container>
);
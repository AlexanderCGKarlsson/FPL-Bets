import { ImageResponse } from "next/og";
import { NextRequest } from 'next/server';
import { DefaultLayout } from '@/app/components/screens/DefaultLayout';
import { WelcomePlayerLayout } from '@/app/components/screens/WelcomePlayerLayout';
import { NewUserWelcomeLayout } from '@/app/components/screens/NewUserWelcomeLayout';
import { MatchupLayout } from '@/app/components/screens/MatchupLayout';
import { BetLayout } from '@/app/components/screens/BetLayout';
import { BetConfirmedLayout } from '@/app/components/screens/BetConfirmedLayout';
import { ErrorLayout } from '@/app/components/screens/ErrorLayout';
import { NEXT_PUBLIC_URL } from '@/app/config';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/farcasterUtils';
import { BetOverviewLayout } from '@/app/components/screens/BetOverviewLayout';
import { LeaderboardLayout, LeaderboardLayoutProps } from '@/app/components/screens/LeaderboardLayout';
import { ProfileLayout } from '@/app/components/screens/ProfileLayout';

export const runtime = "edge";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const layout = searchParams.get('layout') || 'default';

    let LayoutComponent;
    let props: any = {};
    
    switch (layout) {
      
        case 'new-user-welcome':
          LayoutComponent = NewUserWelcomeLayout;
          props = { 
              display_name: searchParams.get('display_name'),
              pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
              userTitle: searchParams.get('userTitle') || 'New Player',
          };
          break;
      
          case 'welcome':
            LayoutComponent = WelcomePlayerLayout;
            const gamesParam = searchParams.get('games');
            const games = gamesParam ? JSON.parse(decodeURIComponent(gamesParam)) : [];
            
            props = { 
              display_name: searchParams.get('display_name'),
              pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
              userTitle: searchParams.get('userTitle'),
              level: parseInt(searchParams.get('level') || '1', 10),
              xp: parseInt(searchParams.get('xp') || '0', 10),
              currentGameweek: searchParams.get('currentGameweek') || '0',
              games: games.map((game: any) => ({
                ...game,
                started: game.started || false,
                isLive: game.started && !game.isFinished,
                homeScore: game.homeScore ?? undefined,
                awayScore: game.awayScore ?? undefined,
                minute: game.minute ?? undefined
              })),
              score: 0
            };
            break;

    
        
      case 'matchup':
      case 'bet':
        LayoutComponent = layout === 'matchup' ? MatchupLayout : BetLayout;
        const homeTeamId = searchParams.get('homeTeamId');
        const awayTeamId = searchParams.get('awayTeamId');
        
        props = {
          homeTeam: searchParams.get('homeTeam') || 'Home Team',
          awayTeam: searchParams.get('awayTeam') || 'Away Team',
          homeTeamLogo: `${NEXT_PUBLIC_URL}/api/teamLogo/${homeTeamId}`,
          awayTeamLogo: `${NEXT_PUBLIC_URL}/api/teamLogo/${awayTeamId}`,
          gameweek: searchParams.get('gameweek') || '0',
          kickoff_time: searchParams.get('kickoff_time') || '',
          deadline: searchParams.get('deadline') || '',
          display_name: searchParams.get('display_name') || 'Anonymous',
          pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
          userTitle: searchParams.get('userTitle') || 'New Player',
          level: parseInt(searchParams.get('level') || '1', 10),
          xp: parseInt(searchParams.get('xp') || '0', 10),
          isNewUser: searchParams.get('isNewUser') === 'true',
          betType: searchParams.get('betType') as '1' | 'X' | '2' || '1'
        };
        break;

      case 'bet-confirmed':
        LayoutComponent = BetConfirmedLayout;
        props = {
          team: searchParams.get('team') || 'Unknown',
          xp: parseInt(searchParams.get('xp') || '0', 10),
          display_name: searchParams.get('display_name'),
          pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
          userTitle: searchParams.get('userTitle')
        };
        break;

        case 'bet-overview':
          LayoutComponent = BetOverviewLayout;
          props = {
            displayName: searchParams.get('display_name') || 'Anonymous',
            pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
            userTitle: searchParams.get('userTitle'),
            level: parseInt(searchParams.get('level') || '1', 10),
            xp: parseInt(searchParams.get('xp') || '0', 10),
            score: parseInt(searchParams.get('xp') || '0', 10),
            gameweek: searchParams.get('gameweek') || '0',
            bets: JSON.parse(decodeURIComponent(searchParams.get('bets') || '[]')),
          };
          break;
      
      case 'leaderboard':
        LayoutComponent = LeaderboardLayout;
        props = {
          leaderboard: JSON.parse(decodeURIComponent(searchParams.get('leaderboard') || '[]')),
        } as LeaderboardLayoutProps;
        break;

      case 'error':
        LayoutComponent = ErrorLayout;
        props = {
          title: searchParams.get('title') || 'Error',
          message: searchParams.get('message') || 'An error occurred',
          additionalInfo: searchParams.get('additionalInfo') || undefined
        };
        break;

      case 'profile':
        LayoutComponent = ProfileLayout;
        const previousBetsStr = searchParams.get('previousBets') || '[]';
        let previousBets = [];
        try {
          previousBets = JSON.parse(previousBetsStr);
        } catch (e) {
          console.error('Failed to parse previousBets:', e);
        }
        
        props = {
          displayName: searchParams.get('display_name') || 'Anonymous',
          pfp_url: searchParams.get('pfp_url') || DEFAULT_PROFILE_PICTURE,
          userTitle: searchParams.get('userTitle') || 'New Player',
          level: parseInt(searchParams.get('level') || '1', 10),
          xp: parseInt(searchParams.get('xp') || '0', 10),
          totalBets: parseInt(searchParams.get('totalBets') || '0', 10),
          correctPredictions: parseInt(searchParams.get('correctPredictions') || '0', 10),
          rank: parseInt(searchParams.get('rank') || '0', 10),
          winRate: parseInt(searchParams.get('winRate') || '0', 10),
          perfectScores: parseInt(searchParams.get('perfectScores') || '0', 10),
          previousBets: previousBets,
        };
        break;

      default:
        LayoutComponent = DefaultLayout;
        props = {
          title: searchParams.get('title') || 'Farcaster Football Bets',
          subtitle: searchParams.get('subtitle') || 'Social Premier League Betting on Farcaster'
        };
    }


    return new ImageResponse(
      (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0f172a', padding: '40px' }}>
          <LayoutComponent {...props} />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        emoji: 'twemoji',
      }
    );
  } catch (e: any) {
    console.error('Error in OG route:', e);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}

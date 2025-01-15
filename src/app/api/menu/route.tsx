import { FrameRequest, getFrameMessage, getFrameHtmlResponse } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';
import { fetchMatchData, getCurrentGameweek } from '@/lib/match_data';
import { placeBet, canUserPlay, getBetsForUser } from '@/lib/bet_logic'
import { checkUserExists, getUserTitle, getUserLevelAndXP, getLeaderboard, getUserStats, getPreviousGameweekBets, getUserProfile } from '@/lib/user_operations';
import { getFarcasterUser } from '@/lib/farcasterUtils';
import { NEXT_PUBLIC_URL } from '@/app/config';
import { FarcasterUser, Bet} from '@/lib/types';
import { DAYS_BEFORE_GAMEWEEK_VISIBLE } from '@/lib/constants';
import { fetchTeams } from '@/lib/api';
import { findNextAvailableMatch, isGameweekOpen, getMatchDeadline } from '@/lib/gameUtils';
import { fetchFixtures } from '@/lib/api';

async function getCachedData() {
  const { matches, isVisible } = await fetchMatchData();
  return { matches, isVisible };
}

// Define HyperFrames
const frames: Record<string, any> = {};

function addHyperFrame(label: string, frame: any) {
  frames[label] = frame;
}

function getHyperFrame(frame: string, state: any, button: number): string | ((state: any) => Promise<string>) {
  const currentFrame = frames[frame];
  if (!currentFrame) {
    console.error(`Frame not found: ${frame}, falling back to home`);
    return frames['home'].frame;
  }
  const nextFrameIdOrFunction = currentFrame[button];
  if (typeof nextFrameIdOrFunction === 'function') {
    return nextFrameIdOrFunction;
  } else if (typeof nextFrameIdOrFunction === 'string') {
    if (!frames[nextFrameIdOrFunction]) {
      console.error(`Frame ${nextFrameIdOrFunction} not found, falling back to home`);
      return frames['home'].frame;
    }
    return frames[nextFrameIdOrFunction].frame;
  } else {
    console.error(`Invalid next frame: ${nextFrameIdOrFunction}, falling back to home`);
    return frames['home'].frame;
  }
}

async function getBettingNotOpenResponse(state: any) {
  const { events } = await fetchTeams();
  const nextGameweek = events.find(event => event.is_next);
  
  let nextGameweekMessage = "Stay tuned for new betting opportunities!";
  if (nextGameweek) {
    const nextGameweekStart = new Date(nextGameweek.deadline_time);
    const bettingOpensDate = new Date(nextGameweekStart.getTime() - (DAYS_BEFORE_GAMEWEEK_VISIBLE - 1) * 24 * 60 * 60 * 1000);
    
    nextGameweekMessage = `Betting for Gameweek ${nextGameweek.id} opens on ${bettingOpensDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  }

  return getFrameHtmlResponse({
    buttons: [
      { label: "️ Back to Home" },
    ],
    image: {
      src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("Betting Not Open Yet")}&message=${encodeURIComponent("We're preparing the next gameweek's matches.")}&additionalInfo=${encodeURIComponent(nextGameweekMessage)}`,
    },
    postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
    state: { ...state, frame: 'matchup-closed' }
  });
}

function safeParseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const parsedDate = new Date(dateString);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

// Define HyperFrames
addHyperFrame('home', {
  frame: getFrameHtmlResponse({
    buttons: [
      { label: "🎮 Start Betting" },
      { label: "📚 How to Play", action: "link", target: "https://docs-site.vercel.app/" },
    ],
    image: {
      src: `${NEXT_PUBLIC_URL}/api/og?layout=default&title=${encodeURIComponent("Farcaster Football Bets")}&subtitle=${encodeURIComponent("Social Premier League Betting on Farcaster")}`,
    },
    postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
  }),
  1: async (state: any) => {
    return frames['welcome'].frame(state);
  }
});

addHyperFrame('welcome', {
  frame: async (state: any) => {
    // console.log(state);
    try {
      const { matches, isVisible } = await getCachedData();
      const farcasterUser = state.farcasterUser;
      const fixtures = await fetchFixtures();

      const minimalMatchData = await Promise.all(matches.map(async (match: any) => {
        const fixture = Array.isArray(fixtures) ? 
          fixtures.find(f => f.id.toString() === match.external_id) : null;

        return {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: fixture?.team_h_score ?? match.homeScore,
          awayScore: fixture?.team_a_score ?? match.awayScore,
          isLive: fixture ? (fixture.started && !fixture.finished && !fixture.finished_provisional) : match.isLive,
          isFinished: fixture ? (fixture.finished || fixture.finished_provisional) : match.is_finished,
          started: fixture?.started || match.started || false,
          minute: fixture?.minutes ?? match.minute,
          gameweek: match.gameweek,
          kickoff_time: match.kickoff_time
        };
      }));
      
      const userExists = await checkUserExists(farcasterUser.fid);
      let userLevel = userExists ? (await getUserLevelAndXP(farcasterUser.fid)).level : -1;
      let userXP = userExists ? (await getUserLevelAndXP(farcasterUser.fid)).xp : 0;

      state.frame = 'welcome';
      state.matchesData = JSON.stringify(minimalMatchData);
      state.currentMatchIndex = 0;
      state.display_name = farcasterUser.display_name;
      state.userTitle = userExists ? await getUserTitle(farcasterUser.fid) : 'New Player';
      state.level = userLevel;
      state.xp = userXP;
      state.fid = farcasterUser.fid;
      state.pfp_url = farcasterUser.pfp_url;
      state.bets = userExists ? await getBetsForUser(farcasterUser.fid, minimalMatchData[0]?.gameweek || await getCurrentGameweek()) : [];
      state.currentGameweek = minimalMatchData[0]?.gameweek || await getCurrentGameweek();

      if (!userExists) {
        return getFrameHtmlResponse({
          buttons: [
            { label: "🎮 Play" },
            { label: "🏆 Leaderboard" },
            { label: "📚 How to Play", action: "link", target: "https://docs-site.vercel.app/" },
          ],
          image: {
            src: `${NEXT_PUBLIC_URL}/api/og?layout=new-user-welcome&display_name=${encodeURIComponent(farcasterUser.display_name)}&pfp_url=${encodeURIComponent(farcasterUser.pfp_url)}`,
          },
          postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
          state
        });
      }

      return getFrameHtmlResponse({
        buttons: [
          { label: state.bets.length > 0 ? "📊 View Bets" : "🎮 Play" },
          { label: "🏆 Leaderboard" },
          { label: "👤 Profile" },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=welcome&currentGameweek=${state.currentGameweek}&display_name=${encodeURIComponent(state.display_name)}&pfp_url=${encodeURIComponent(state.pfp_url)}&userTitle=${encodeURIComponent(state.userTitle)}&level=${state.level}&xp=${state.xp}&games=${encodeURIComponent(JSON.stringify(minimalMatchData))}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state
      });
    } catch (error) {
      console.error('Error in welcome frame:', error);
      return getFrameHtmlResponse({
        buttons: [
          { label: "🔄 Retry" },
          { label: "🏠 Home" },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("An error occurred")}&message=${encodeURIComponent("We're sorry, but something went wrong. Please try again.")}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state: { ...state, frame: 'error' }
      });
    }
  },
  1: async (state: any) => {
    if (state.bets && state.bets.length > 0) {
      return frames['bet-overview'].frame(state);
    } else {
      return frames['matchup'].frame(state);
    }
  },
  2: 'leaderboard',
  3: 'profile'
});

addHyperFrame('matchup', {
  frame: async (state: any) => {
    try {
      const matches = JSON.parse(state.matchesData || '[]');
      
      // First check if the gameweek is open for betting
      const gameweekStatus = await isGameweekOpen(matches[0].gameweek);

      if (!gameweekStatus.isOpen) {
        return getFrameHtmlResponse({
          buttons: [
            { label: "️ Back to Home" },
          ],
          image: {
            src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("Betting Not Available")}&message=${encodeURIComponent(gameweekStatus.message || "Betting is not available at this time.")}`,
          },
          postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
          state: { ...state, frame: 'matchup-closed' }
        });
      }
      
      const availableMatchIndex = findNextAvailableMatch(matches, state.currentMatchIndex || 0);

      if (availableMatchIndex === -1) {
        console.log('No available matches, redirecting to bet-overview');
        return frames['bet-overview'].frame(state);
      }
      
      const currentMatch = matches[availableMatchIndex];
      const kickoff_time = new Date(currentMatch.kickoff_time);
      const deadline = getMatchDeadline(currentMatch);

      const imageParams = new URLSearchParams({
        layout: 'matchup',
        homeTeam: currentMatch.homeTeam || 'Unknown',
        awayTeam: currentMatch.awayTeam || 'Unknown',
        homeTeamId: currentMatch.homeTeamId?.toString() || '',
        awayTeamId: currentMatch.awayTeamId?.toString() || '',
        kickoff_time: kickoff_time.toISOString(),
        deadline: deadline.toISOString(),
        gameweek: currentMatch.gameweek?.toString() || '',
        display_name: state.display_name || 'Anonymous',
        pfp_url: state.pfp_url || '',
        userTitle: state.userTitle || 'New Player',
        level: state.level?.toString() || '1',
        xp: state.xp?.toString() || '0'
      });

      return getFrameHtmlResponse({
        buttons: [
          { label: `1 (${currentMatch.homeTeam})` },
          { label: `X (Draw)` },
          { label: `2 (${currentMatch.awayTeam})` },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?${imageParams.toString()}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state: { 
          ...state,
          frame: 'matchup', 
          currentMatchIndex: availableMatchIndex,
          currentGameweek: currentMatch.gameweek,
          currentMatchId: currentMatch.id,
          homeTeamId: currentMatch.homeTeamId,
          awayTeamId: currentMatch.awayTeamId,
        }
      });
    } catch (error) {
      console.error('Error in matchup frame:', error);
      return getFrameHtmlResponse({
        buttons: [
          { label: "🔄 Retry" },
          { label: "🏠 Home" },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("An error occurred")}&message=${encodeURIComponent("We're sorry, but something went wrong. Please try again.")}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state: { ...state, frame: 'error' }
      });
    }
  },
  1: async (state: any) => {
    return frames['place-bet-home'].frame(state);
  },
  2: async (state: any) => {
    return frames['place-bet-draw'].frame(state);
  },
  3: async (state: any) => {
    return frames['place-bet-away'].frame(state);
  },
});

// Update the place-bet frames
addHyperFrame('place-bet-home', {
  frame: async (state: any) => {
    const matches = JSON.parse(state.matchesData || '[]');
    const availableMatchIndex = findNextAvailableMatch(matches, state.currentMatchIndex);

    if (availableMatchIndex === -1) {
      return getBettingNotOpenResponse(state);
    }

    const currentMatch = matches[availableMatchIndex];
    const kickoff_time = new Date(currentMatch.kickoff_time);
    const deadline = new Date(kickoff_time.getTime() - 60 * 60 * 1000); // 1 hour before kickoff

    const imageParams = new URLSearchParams({
      layout: 'bet',
      homeTeam: currentMatch.homeTeam || 'Unknown',
      awayTeam: currentMatch.awayTeam || 'Unknown',
      homeTeamId: currentMatch.homeTeamId?.toString() || '',
      awayTeamId: currentMatch.awayTeamId?.toString() || '',
      kickoff_time: kickoff_time.toISOString(),
      deadline: deadline.toISOString(),
      gameweek: currentMatch.gameweek?.toString() || '',
      display_name: state.display_name,
      pfp_url: state.pfp_url,
      userTitle: state.userTitle,
      level: state.level.toString(),
      xp: state.xp.toString(),
      betType: '1'
    });

    return getFrameHtmlResponse({
      buttons: [
        { label: "Confirm" },
        { label: "Cancel" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?${imageParams.toString()}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { 
        ...state, 
        betType: '1',
        frame: 'place-bet-home',
        currentMatchIndex: availableMatchIndex
      }
    });
  },
  1: async (state: any) => {
    const matches = JSON.parse(state.matchesData || '[]');
    const currentMatch = matches[state.currentMatchIndex];

    await placeBet(state.fid, currentMatch.id, '1', state.display_name, state.pfp_url);

    const nextAvailableIndex = findNextAvailableMatch(matches, state.currentMatchIndex + 1);

    if (nextAvailableIndex === -1) {
      return frames['bet-overview'].frame(state);
    } else {
      return frames['matchup'].frame({ ...state, currentMatchIndex: nextAvailableIndex });
    }
  },
  2: 'matchup',
});

addHyperFrame('place-bet-draw', {
  frame: async (state: any) => {
    const matches = JSON.parse(state.matchesData || '[]');
    const currentMatch = matches[state.currentMatchIndex];
    
    const canPlay = await canUserPlay(state.fid, currentMatch.id);
    if (!canPlay) {
      return getBettingNotOpenResponse(state);
    }
    
    const kickoff_time = safeParseDateString(currentMatch.kickoff_time);

    if (!kickoff_time) {
      console.error('Invalid kickoff time detected:', { kickoff_time: currentMatch.kickoff_time });
      return getFrameHtmlResponse({
        buttons: [
          { label: "🔄 Retry" },
          { label: "🏠 Home" },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("Invalid Date")}&message=${encodeURIComponent("We encountered an issue with the match dates. Please try again later.")}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state: { ...state, frame: 'error' }
      });
    }

    const deadline = new Date(kickoff_time.getTime() - 60 * 60 * 1000);

    const imageParams = new URLSearchParams({
      layout: 'bet',
      homeTeam: currentMatch.homeTeam || 'Unknown',
      awayTeam: currentMatch.awayTeam || 'Unknown',
      homeTeamId: currentMatch.homeTeamId?.toString() || '',
      awayTeamId: currentMatch.awayTeamId?.toString() || '',
      kickoff_time: kickoff_time.toISOString(),
      deadline: deadline.toISOString(),
      gameweek: currentMatch.gameweek?.toString() || '',
      display_name: state.display_name,
      pfp_url: state.pfp_url,
      userTitle: state.userTitle,
      level: state.level.toString(),
      xp: state.xp.toString(),
      betType: 'X'
    });


    return getFrameHtmlResponse({
      buttons: [
        { label: "Confirm" },
        { label: "Cancel" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?${imageParams.toString()}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { 
        ...state, 
        betType: 'X',
        frame: 'place-bet-draw'
      }
    });
  },
  1: async (state: any) => {
    await placeBet(state.fid, state.currentMatchId, 'X', state.display_name, state.pfp_url);
    
    // Increment the match index
    state.currentMatchIndex += 1;
    
    // Check if there are more matches to bet on
    const matches = JSON.parse(state.matchesData || '[]');
    if (state.currentMatchIndex < matches.length) {
      return frames['matchup'].frame(state);
    } else {
      // If all matches have been bet on, go to bet overview
      return frames['bet-overview'].frame(state);
    }
  },
  2: 'matchup',
});

addHyperFrame('place-bet-away', {
  frame: async (state: any) => {
    const matches = JSON.parse(state.matchesData || '[]');
    const currentMatch = matches[state.currentMatchIndex];
    
    const canPlay = await canUserPlay(state.fid, currentMatch.id);
    if (!canPlay) {
      return getBettingNotOpenResponse(state);
    }
    
    const kickoff_time = safeParseDateString(currentMatch.kickoff_time);

    if (!kickoff_time) {
      console.error('Invalid kickoff time detected:', { kickoff_time: currentMatch.kickoff_time });
      return getFrameHtmlResponse({
        buttons: [
          { label: "🔄 Retry" },
          { label: "🏠 Home" },
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("Invalid Date")}&message=${encodeURIComponent("We encountered an issue with the match dates. Please try again later.")}`,
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        state: { ...state, frame: 'error' }
      });
    }

    const deadline = new Date(kickoff_time.getTime() - 60 * 60 * 1000);

    const imageParams = new URLSearchParams({
      layout: 'bet',
      homeTeam: currentMatch.homeTeam || 'Unknown',
      awayTeam: currentMatch.awayTeam || 'Unknown',
      homeTeamId: currentMatch.homeTeamId?.toString() || '',
      awayTeamId: currentMatch.awayTeamId?.toString() || '',
      kickoff_time: kickoff_time.toISOString(),
      deadline: deadline.toISOString(),
      gameweek: currentMatch.gameweek?.toString() || '',
      display_name: state.display_name,
      pfp_url: state.pfp_url,
      userTitle: state.userTitle,
      level: state.level.toString(),
      xp: state.xp.toString(),
      betType: '2'
    });


    return getFrameHtmlResponse({
      buttons: [
        { label: "Confirm" },
        { label: "Cancel" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?${imageParams.toString()}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { 
        ...state, 
        betType: '2',
        frame: 'place-bet-away'
      }
    });
  },
  1: async (state: any) => {
    await placeBet(state.fid, state.currentMatchId, '2', state.display_name, state.pfp_url);
    
    // Increment the match index
    state.currentMatchIndex += 1;
    
    // Check if there are more matches to bet on
    const matches = JSON.parse(state.matchesData || '[]');
    if (state.currentMatchIndex < matches.length) {
      return frames['matchup'].frame(state);
    } else {
      // If all matches have been bet on, go to bet overview
      return frames['bet-overview'].frame(state);
    }
  },
  2: 'matchup',
});

addHyperFrame('deadline-passed', {
  frame: async (state: any) => {
    return getFrameHtmlResponse({
      buttons: [
        { label: "Next Match" },
        { label: "🏠 Back to Home" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?layout=error&title=${encodeURIComponent("Betting Not Open Yet")}&message=${encodeURIComponent("Betting for this match is not open yet.")}&additionalInfo=${encodeURIComponent("You can't place a bet for this match at this time.")}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { ...state, frame: 'deadline-passed' }
    });
  },
  1: async (state: any) => {
    const matches = JSON.parse(state.matchesData);
    const nextMatchIndex = (state.currentMatchIndex + 1) % matches.length;
    return frames['matchup'].frame({ ...state, currentMatchIndex: nextMatchIndex });
  },
  2: 'welcome',
});

addHyperFrame('bet-overview', {
  frame: async (state: any) => {
    const matches = JSON.parse(state.matchesData);
    const currentGameweek = matches[0].gameweek;

    // Fetch the latest bets for the user
    const userBets = await getBetsForUser(state.fid, currentGameweek);

    // Format the bets
    const formattedBets = matches.map((match: any) => {
      const existingBet = userBets.find((bet: Bet) => bet.matchId === match.id);
      
      const gameDate = new Date(match.kickoff_time).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const deadline = new Date(new Date(match.kickoff_time).getTime() - 60 * 60 * 1000).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchDate: gameDate,
        matchDeadline: deadline,
        prediction: existingBet ? existingBet.prediction : 'Not bet'
      };
    });

    const betsParam = encodeURIComponent(JSON.stringify(formattedBets));

    return getFrameHtmlResponse({
      buttons: [
        { label: "📝 Edit/Add Bets" },
        { label: "🏠 Back to Home" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?layout=bet-overview&gameweek=${currentGameweek}&display_name=${encodeURIComponent(state.display_name)}&pfp_url=${encodeURIComponent(state.pfp_url || '')}&userTitle=${encodeURIComponent(state.userTitle)}&level=${state.level}&xp=${state.xp}&bets=${betsParam}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { ...state, frame: 'bet-overview', formattedBets }
    });
  },
  1: async (state: any) => {
    // Reset the currentMatchIndex to 0 when editing/adding bets
    return frames['matchup'].frame({ ...state, currentMatchIndex: 0 });
  },
  2: 'welcome',
});

addHyperFrame('leaderboard', {
  frame: async (state: any) => {
    const leaderboard = await getLeaderboard();
    
    return getFrameHtmlResponse({
      buttons: [
        { label: "🏠 Back to Home" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?layout=leaderboard&leaderboard=${encodeURIComponent(JSON.stringify(leaderboard))}`,
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      state: { ...state, frame: 'leaderboard' }
    });
  },
  1: 'welcome',
});

addHyperFrame('profile', {
  frame: async (state: any) => {
    if (!state.fid) {
      throw new Error('No FID provided');
    }

    // If we have a search query, try to find that user instead
    const searchFid = state.searchFid || state.fid;

    const stats = await getUserStats(searchFid);
    const currentGameweek = await getCurrentGameweek();
    const previousBets = await getPreviousGameweekBets(searchFid, currentGameweek);
    const userData = await getUserProfile(searchFid);

    if (!userData) {
      throw new Error('User not found');
    }

    // Create params object with all values as strings
    const params: Record<string, string> = {
      display_name: userData.display_name || '',
      pfp_url: userData.pfp_url || '',
      userTitle: userData.title || '',
      level: (userData.level || 1).toString(),
      xp: (userData.xp || 0).toString(),
      totalBets: stats.totalBets.toString(),
      correctPredictions: stats.correctPredictions.toString(),
      rank: stats.rank.toString(),
      winRate: stats.winRate.toString(),
      perfectScores: stats.perfectScore.toString(),
      previousBets: JSON.stringify(previousBets)
    };

    // Preserve essential state data
    const minimalState = {
      fid: state.fid,
      frame: 'profile',
      searchFid: state.searchFid,
      display_name: state.display_name,
      pfp_url: state.pfp_url,
      userTitle: state.userTitle,
      level: state.level,
      xp: state.xp,
      farcasterUser: state.farcasterUser
    };

    return getFrameHtmlResponse({
      buttons: [
        { label: "🏠 Home" },
        { label: "🔍 Search", action: "post" },
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?layout=profile&` + new URLSearchParams(params).toString(),
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      input: { text: "Enter FID to search" },
      state: minimalState
    });
  },
  1: 'welcome',
  2: async (state: any) => {
    // Get input text based on environment
    let inputText;
    if (process.env.NODE_ENV === 'development') {
      const body = state.rawBody;
      inputText = body?.mockFrameData?.input;
    } else {
      const body = state.rawBody;
      inputText = body?.untrustedData?.inputText;
    }

    if (!inputText) {
      return getFrameHtmlResponse({
        buttons: [
          { label: "⬅️ Back to Profile" },
          { label: "🔍 Try Again" }
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&` + new URLSearchParams({
            title: "Oops! 🤔",
            message: "Please enter an FID to search",
            additionalInfo: "Tip: You can find a user's FID in their Farcaster profile"
          }).toString(),
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        input: { text: "Enter FID to search" },
        state: { 
          ...state,
          frame: 'profile-error',
          previousFrame: 'profile'
        }
      });
    }

    // Try to parse FID from input
    const searchFid = parseInt(inputText);

    if (isNaN(searchFid)) {
      return getFrameHtmlResponse({
        buttons: [
          { label: "⬅️ Back to Profile" },
          { label: "🔍 Try Again" }
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&` + new URLSearchParams({
            title: "Invalid FID 🚫",
            message: "FIDs should be numbers only",
            additionalInfo: "Example: 318845"
          }).toString(),
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        input: { text: "Enter FID to search" },
        state: { ...state, frame: 'profile' }
      });
    }

    // Check if user exists
    const userExists = await checkUserExists(searchFid);

    if (!userExists) {
      return getFrameHtmlResponse({
        buttons: [
          { label: "⬅️ Back to Profile" },
          { label: "🔍 Try Another" }
        ],
        image: {
          src: `${NEXT_PUBLIC_URL}/api/og?layout=error&` + new URLSearchParams({
            title: "Player Not Found 👀",
            message: `Your buddy (FID: ${searchFid}) hasn't played FPLBets yet`,
            additionalInfo: "Why don't you let them know they're missing all the fun! 🎮⚽"
          }).toString(),
        },
        postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
        input: { text: "Enter FID to search" },
        state: { ...state, frame: 'profile' }
      });
    }

    // Return to profile frame with the searched FID
    return frames['profile'].frame({ 
      ...state, 
      fid: state.fid,
      searchFid: searchFid,
      rawBody: state.rawBody // Make sure to pass rawBody
    });
  }
});

// Add a new frame handler for profile-error
addHyperFrame('profile-error', {
  frame: async (state: any) => {
    return getFrameHtmlResponse({
      buttons: [
        { label: "⬅️ Back to Profile" },
        { label: "🔍 Try Again" }
      ],
      image: {
        src: `${NEXT_PUBLIC_URL}/api/og?layout=error&` + new URLSearchParams({
          title: "Oops! 🤔",
          message: "Please enter an FID to search",
          additionalInfo: "Tip: You can find a user's FID in their Farcaster profile"
        }).toString(),
      },
      postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
      input: { text: "Enter FID to search" },
      state: state
    });
  },
  1: async (state: any) => {
    // Return to profile frame with original user's data
    return frames['profile'].frame({
      ...state,
      frame: 'profile',
      searchFid: undefined // Reset searchFid to show original profile
    });
  },
  2: async (state: any) => {
    // Stay on error frame for retry
    return frames['profile-error'].frame(state);
  }
});

async function getResponse(req: NextRequest): Promise<NextResponse> {
  let body: FrameRequest;
  let buttonIndex: number;
  let state: any = {};
  let farcasterUser: FarcasterUser | null = null;

  try {
    body = await req.json();
    
    if (process.env.NODE_ENV === 'development') {
      buttonIndex = body.untrustedData.buttonIndex;
      state = body.untrustedData.state ? 
        (typeof body.untrustedData.state === 'string' ? JSON.parse(body.untrustedData.state) : body.untrustedData.state) 
        : {};
      
      farcasterUser = state.farcasterUser || {
        fid: 999999,
        display_name: 'Dev User',
        pfp_url: 'https://i.imgur.com/VOkDJEM.jpg',
        verifiedAddress: '0x1234567890123456789012345678901234567890'
      };
    } else {
      try {
        const { isValid, message } = await getFrameMessage(body, { neynarApiKey: process.env.NEYNAR_API_KEY || '' });
        if (!isValid) {
          console.error('Invalid message');
          return new NextResponse('Invalid message', { status: 400 });
        }

        buttonIndex = message.button;
        farcasterUser = getFarcasterUser(message);

        if (message.state) {
          try {
            if (typeof message.state === 'string') {
              state = JSON.parse(decodeURIComponent(message.state));
            } else if (message.state.serialized) {
              state = JSON.parse(decodeURIComponent(message.state.serialized));
            } else {
              state = message.state;
            }
          } catch (error) {
            console.error('Error parsing state:', error);
            state = {};
          }
        } else {
          state = {};
        }
      } catch (error) {
        console.error('Error processing request:', error);
        return new NextResponse('Error processing request', { status: 500 });
      }
    }

    const currentFrame = state.frame || 'home';
    
    // Only pass rawBody to profile frame when needed for search
    const frameState = currentFrame === 'profile' && buttonIndex === 2
      ? { ...state, farcasterUser, rawBody: body }
      : { ...state, farcasterUser };

    const nextFrame = getHyperFrame(currentFrame, frameState, buttonIndex);

    if (typeof nextFrame === 'function') {
      const response = await nextFrame(frameState);
      return new NextResponse(response);
    } else if (typeof nextFrame === 'object' && nextFrame !== null && 'then' in nextFrame) {
      const response = await nextFrame;
      return new NextResponse(response);
    } else {
      return new NextResponse(nextFrame);
    }
  } catch (error) {
    console.error('Error in getResponse:', error);
    const homeFrame = frames['home'].frame;
    if (typeof homeFrame === 'function') {
      const response = await homeFrame({ ...state, farcasterUser });
      return new NextResponse(response);
    } else {
      return new NextResponse(homeFrame);
    }
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';


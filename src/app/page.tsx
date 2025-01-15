import { getFrameMetadata } from '@coinbase/onchainkit/frame';
import type { Metadata } from 'next';
import { NEXT_PUBLIC_URL } from './config';
import { DOC_URL } from '../lib/constants';

const frameMetadata = getFrameMetadata({
  buttons: [
    { label: '🎮 Start Betting' },
    { label: '📚 How to Play', action: 'link', target: DOC_URL },
  ],
  image: {
    src: `${NEXT_PUBLIC_URL}/api/og?layout=default&title=${encodeURIComponent("Farcaster Football Bets")}&subtitle=${encodeURIComponent("Social Premier League Betting on Farcaster")}`,
    aspectRatio: '1.91:1',
  },
  postUrl: `${NEXT_PUBLIC_URL}/api/menu`,
});

export const metadata: Metadata = {
  title: 'Farcaster Football Bets',
  description: 'Social Premier League Betting on Farcaster',
  openGraph: {
    title: 'Farcaster Football Bets',
    description: 'Social Premier League Betting on Farcaster',
    images: [`${NEXT_PUBLIC_URL}/api/og?title=Farcaster Football Bets&subtitle=A social betting platform on`],
  },
  other: {
    ...frameMetadata,
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">⚽️ Farcaster Football Bets</h1>
        <p className="text-xl text-blue-400">Bet smarter, play together</p>
      </header>

      <main>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { emoji: "👥", title: "Social", description: "Bet with friends on Farcaster" },
            { emoji: "🎮", title: "Gamified Betting", description: "Conquer the leaderboards and earn recognition" },
            { emoji: "🌐", title: "Web3 Native", description: "Built on Farcaster" },
          ].map((feature) => (
            <div 
              key={feature.title}
              className="bg-slate-800 p-4 rounded-lg border-2 border-blue-500 text-center"
            >
              <p className="text-4xl mb-2">{feature.emoji}</p>
              <h2 className="text-xl font-bold mb-2">{feature.title}</h2>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to join the game?</h2>
          <p className="text-lg text-slate-400 mb-4">Experience the future of football betting on Farcaster, you'll need a Farcaster account to join.</p>
          <div className="flex justify-center gap-6"> {/* Changed this line */}
            <a 
              href="https://warpcast.com/~/channel/football"
              className="inline-block bg-green-600 text-white font-bold py-2 px-4 rounded-full"
            >
              🎮 Play on Farcaster
            </a>
            <a
              href={DOC_URL}
              className="inline-block bg-green-600 text-white font-bold py-2 px-4 rounded-full"
            >
              📚 Documentation
            </a>
          </div>
        </section>
        
      </main>

      <footer className="mt-8 text-center text-slate-400">
        <p>&copy; 2024 Farcaster Football Bets. All rights reserved.</p>
      </footer>
    </div>
  )
}
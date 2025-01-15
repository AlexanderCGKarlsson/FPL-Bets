# Farcaster Football Bets

Farcaster Football Bets is a social betting platform for Premier League matches, built on the Farcaster protocol. The application allows users to place bets on upcoming matches, compete on a leaderboard, and earn rewards based on their predictions.

## Features

- ✅ Personalized welcome screen with user profile integration
- ✅ Real-time stats fetching from the database
- ✅ Dynamic OG image generation for social sharing
- ✅ Current gameweek match selection and display
- ✅ Smooth frame transitions and robust state management
- ✅ Integration with Farcaster user data
- ✅ Delayed user registration until first bet placement
- ✅ Betting UI for match predictions
- ✅ Core betting logic with database integration
- ✅ Leaderboard functionality
- ✅ User profiles and betting history
- ✅ Real-time match result updates

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Vercel OG Image Generation
- PostgreSQL (or your specific database)
- Farcaster Protocol
- Imgur for handling avatars (if gif)
- Telegram Bot for monitoring

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/alexandercgkarlsson/FPL-Bets.git
   ```

2. Install dependencies:
   ```
   cd FPLBets
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add necessary variables (database connection, API keys, etc.)

   - DATABASE_URL
   - KV_URL
   - KV_REST_API_URL
   - KV_REST_API_TOKEN
   - KV_REST_API_READ_ONLY_TOKEN
   - CRON_SECRET
   - NEYNAR_API_KEY
   - BYPASS_CACHE=false (can be set to true for development)
   - IMGUR_CLIENT_ID=
   - TELEGRAM_BOT_TOKEN= (Optional will receive some monitoring)
   - TELEGRAM_CHAT_ID= (Optional)

If you do decide not to use the Telegram, any code utilizing it should be commented out. 


4. Set up database schema towards new database / check the schema.
   in `db.ts`uncomment ```checkAndDeploySchema().catch(console.error);```


5. Run the development server:
   ```
   bun run dev
   ```

6. The application is served over [http://localhost:3000](http://localhost:3000) but for testing the frame you can use OnchainKit frame server or any other debug server.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── convert-image/
│   │   │   └── route.ts
│   │   ├── cron/
│   │   │   ├── updateCache/
│   │   │   │   └── route.tsx
│   │   │   └── updateDatabase/
│   │   │       └── route.tsx
│   │   ├── teamLogo/[id]/
│   │   │   └── route.tsx
│   │   ├── menu/
│   │   │   └── route.tsx
│   │   └── og/
│   │       └── route.tsx
│   ├── components/
│   │   └── screens/
│   │       ├── DefaultLayout.tsx
│   │       ├── LayoutComponents.tsx
│   │       ├── WelcomePlayerLayout.tsx
│   │       └── MatchupLayout.tsx
│   ├── page.tsx
│   └── layout.tsx
└── lib/
    ├── db.ts
    ├── matchData.ts
    └── dbOperations.ts
```

## Deploy to Production
- Do not forget to set `NEXT_PUBIC_URL`in the config.ts otherwise you will get error message: "validateFrameEmbed 400 - Unable to fetch image, upstream server error: 403 Forbidden"


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgements

- [Farcaster Protocol](https://www.farcaster.xyz/)
- [Vercel](https://vercel.com) for OG image generation and hosting
- [Premier League](https://www.premierleague.com/) for match data
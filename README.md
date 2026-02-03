# LewReviews

A TikTok-style video review platform where users can create short-form video reviews and respond to each other's content with agree/disagree video responses, creating engaging conversation chains.

## Tech Stack

- **Mobile App**: React Native + Expo (SDK 52)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand (client) + TanStack Query (server)
- **Video**: expo-video for playback, expo-media-library for capture
- **UI**: React Native Reanimated, Shopify FlashList

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier available at [supabase.com](https://supabase.com))
- iOS Simulator (macOS) or Android Emulator, or physical device with Expo Go

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LewReviews
```

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 4. Run Database Migrations

Navigate to the SQL Editor in your Supabase dashboard and run the migrations in order:

```bash
# Run these SQL files in order:
supabase/migrations/00001_initial_schema.sql
supabase/migrations/00002_row_level_security.sql
supabase/migrations/00003_storage_buckets.sql
supabase/migrations/00004_add_agree_disagree.sql
```

Alternatively, if using Supabase CLI:

```bash
supabase db push
```

### 5. Configure Environment Variables

```bash
cd mobile
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Start Development Server

```bash
cd mobile
npx expo start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## Folder Structure

```
LewReviews/
├── mobile/                    # React Native Expo app
│   ├── app/                   # Expo Router pages (file-based routing)
│   │   ├── (tabs)/            # Tab navigation screens
│   │   ├── (modals)/          # Modal screens
│   │   └── video/             # Video detail screens
│   ├── components/            # Reusable UI components
│   │   └── video/             # Video-specific components
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript type definitions
│   └── docs/                  # Mobile-specific documentation
├── lib/                       # Shared library code
│   ├── supabase.ts            # Supabase client configuration
│   └── auth.tsx               # Authentication context
├── types/                     # Shared TypeScript types
│   └── database.ts            # Database type definitions
├── supabase/                  # Supabase configuration
│   └── migrations/            # SQL migration files
└── docs/                      # Project documentation
    └── response-chains/       # Feature documentation
```

## Development Workflow

### Key Features

- **Video Feed**: TikTok-style vertical scrolling feed with FlashList
- **Response Chains**: Reply to videos with agree/disagree stance
- **Video Recording**: Create new video reviews
- **User Profiles**: View and manage user content

### Running Tests

```bash
cd mobile
npm test
```

### Linting

```bash
cd mobile
npm run lint
```

### Building for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Database Schema

The app uses a PostgreSQL database with the following core tables:

- `profiles` - User profiles extending Supabase Auth
- `videos` - Video content with response chain support (parent_video_id, agree_disagree)
- `likes` - User likes on videos
- `follows` - Follower/following relationships

See `/supabase/migrations/` for complete schema details.

## Roadmap

- [ ] Share & deep links (native share sheet, universal links, OG previews)
- [ ] Debate view (split-screen original vs top disagreement)
- [ ] Community consensus percentages on videos
- [ ] Push notifications (responses, disagreements, new followers)
- [ ] TMDB integration (movie/show tagging, posters, metadata)
- [ ] Search & discovery (by movie, creator, trending)
- [ ] Feed algorithm (engagement-weighted "For You" tab)
- [ ] Client-side video compression
- [ ] Text comments
- [ ] Onboarding & guided first review
- [ ] Gamification (streaks, badges, leaderboards)

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Private - All rights reserved

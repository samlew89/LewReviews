# CLAUDE.md – LewReviews MVP Instructions

## Project Overview
LewReviews is a TikTok-style vertical video feed for movie/TV reviews.
Users upload short review videos. Responses are video-only replies that require an agree/disagree stance.
Response chains accessed via swipe-left or translucent arrow.
MVP goal: low-cost build using Expo + Supabase free tier (no advanced transcoding yet).

## Current Status: MVP Code Complete ✅
- **Phase 1:** Supabase schema, auth, video feed, upload, response chains
- **Phase 2:** Auth UI, profile features, swipe gestures, documentation
- **Supabase:** Project created, combined migration run successfully
- **Packages:** All expo packages installed (expo-video, expo-image-picker, etc.)
- **Auth:** AuthProvider context created (lib/auth.tsx)
- **Next:** Test in Expo Go or iOS Simulator

## Supabase Project
- **URL:** https://qwotlnuhszatzifasngg.supabase.co
- **Migration:** Run `supabase/combined_migration.sql` in SQL Editor (already done)
- **Buckets:** videos (100MB), thumbnails (5MB), avatars (2MB)

## Tech Stack & Conventions
- React Native + Expo SDK 52 (managed workflow)
- Supabase (auth, Postgres DB, storage)
- TypeScript (strict mode)
- State: Zustand + TanStack React Query
- Video playback: expo-video
- Gestures: react-native-gesture-handler + Reanimated
- Folder structure: Follow Expo Router pattern (app/(tabs)/, app/(modals)/, components/video/, hooks/, lib/, types/)
- Commits: Conventional Commits (feat:, fix:, refactor:, chore:, etc.)

## Workflow & Behavior Rules
- ALWAYS plan in detail (markdown) before writing code.
- Use subagents aggressively for parallel/independent tasks.
- Commit after each logical chunk with descriptive conventional message.
- Proceed autonomously on routine file edits (acceptEdits enabled).
- Ask only on high-risk actions: Supabase schema changes, external API keys, destructive operations, permissions changes.
- Prefer readability + explicit code over clever/one-liners.
- No console.log in committed code.
- When spawning subagents: give clear roles/descriptions (e.g., "Supabase Specialist", "UI/Feed Engineer").

## Safety & Constraints
- Never delete code unless explicitly instructed or obviously dead/unused.
- Enforce agree_disagree boolean on response videos (parent_video_id not null).
- Video length: enforce ~60s max via duration_seconds.
- Use targeted tests (e.g., single file) instead of full suite for speed.

## Project Structure
```
LewReviews/
├── CLAUDE.md, README.md, .gitignore
├── supabase/migrations/        # 4 SQL migration files
├── lib/                        # Root auth.tsx, supabase.ts
├── types/                      # database.ts
└── mobile/
    ├── app/
    │   ├── (auth)/             # login, signup
    │   ├── (tabs)/             # feed, create, profile
    │   ├── (modals)/           # agree-disagree, response-upload, edit-profile
    │   ├── video/[id].tsx
    │   └── profile/[id].tsx
    ├── components/video/       # VideoPlayer, VideoFeed, VideoCard, UploadForm
    ├── components/             # ResponseChain
    ├── hooks/                  # useVideoUpload, useVideoFeed, useResponseChain, useFollow
    ├── lib/                    # supabase, auth, video
    ├── constants/config.ts
    └── .env.example
```

## Quick Start
```bash
cd mobile
npm install
# .env already configured with Supabase credentials
```

## Testing the App

### Option 1: Expo Go on Phone (MUST run in interactive terminal)
```bash
cd mobile
npx expo start
# QR code appears in terminal - scan with iPhone camera
# Phone and Mac must be on same WiFi
```
**Important:** The QR code only shows in an interactive terminal, NOT in background processes.
If localhost:8081 shows the app instead of QR code, that's the web version.

### Option 2: iOS Simulator (requires Xcode)
```bash
# Install Xcode from App Store first
xcode-select --install
npx expo start --ios
```

### Option 3: Android Emulator (requires Android Studio)
```bash
npx expo start --android
```

### Option 4: Tunnel mode (if WiFi issues)
```bash
npx expo start --tunnel
# Creates public URL, scan QR from terminal
```

## Known TODOs
- Settings screen navigation
- Login prompt for unauthenticated likes
- Client-side video compression (see docs/COMPRESSION.md)
- Full edit-profile implementation

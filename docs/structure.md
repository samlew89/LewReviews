# Tech Stack & Project Structure

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native + Expo SDK 54 (managed workflow) |
| Backend | Supabase (auth, Postgres DB, storage) |
| Language | TypeScript (strict mode) |
| State | Zustand + TanStack React Query |
| Video | expo-video, react-native-compressor |
| UI | @gorhom/bottom-sheet v5, react-native-gesture-handler, Reanimated |
| Monitoring | Sentry (@sentry/react-native), PostHog (posthog-react-native) |
| Builds | EAS Build (eas.json configured) |

## Conventions

- Folder structure: Expo Router pattern
- Commits: Conventional Commits (feat:, fix:, refactor:, chore:)

## Project Structure

```
LewReviews/
├── CLAUDE.md, README.md, .gitignore
├── docs/                       # Documentation (imported by CLAUDE.md)
├── supabase/migrations/        # 8 SQL migration files
├── lib/                        # Root auth.tsx, supabase.ts
├── types/                      # database.ts
└── mobile/
    ├── app/
    │   ├── (auth)/             # login, signup
    │   ├── (tabs)/             # feed, discover, create, profile
    │   ├── (modals)/           # response-upload, edit-profile
    │   ├── video/[id].tsx
    │   ├── profile/[id].tsx
    │   ├── followers/[id].tsx
    │   └── following/[id].tsx
    ├── components/video/       # VideoPlayer, VideoFeed, VideoCard, UploadForm, RepliesDrawer, ReplyListItem
    ├── components/             # ResponseChain, UserListItem
    ├── hooks/                  # useVideoUpload, useVideoFeed, useResponseChain, useFollow, useUserSearch, useFollowList, useSuggestedUsers
    ├── lib/                    # supabase, auth, video, analytics
    ├── constants/config.ts
    ├── eas.json                # EAS Build configuration
    └── .env.example
```

# CLAUDE.md – LewReviews MVP Instructions

## Project Overview
LewReviews is a TikTok-style vertical video feed for movie/TV reviews.
Users upload short review videos. Responses are video-only replies that require an agree/disagree stance.
Response chains accessed via tap on Replies button (arrow icon).
MVP goal: low-cost build using Expo + Supabase free tier (no advanced transcoding yet).

## Current Status: MVP Core Complete ✅
- **Phase 1:** Supabase schema, auth, video feed, upload, response chains ✅
- **Phase 2:** Auth UI, profile features, documentation ✅
- **Phase 3:** Agree/disagree system replaces likes, profile ratio stats ✅
- **Phase 4:** Followers system — Discover tab, user search, suggested users, followers/following lists ✅
- **Supabase:** Project created, migrations run, email confirmation DISABLED for dev
- **Packages:** All expo packages installed + react-native-worklets peer dep
- **Auth:** Working - signup/login functional, auto-redirects on auth state change
- **Upload:** Working - video upload to Supabase storage functional
- **Feed:** Shows consensus percentage (e.g., "73% agree") - no tap-to-vote, video responses only
- **Profile:** Shows Ratio (agrees - disagrees), tabs for videos user responded to with that stance
- **Discover:** Search users by username, suggested users (most followed), follow/unfollow inline
- **Follow Lists:** Tappable follower/following counts on all profiles → paginated list screens
- **Leaderboard:** Top ratios for All users and Friends (people you follow), trophy-colored top 3
- **Consensus:** Percentage badge moved to top left of video (was in right-side actions)

## Supabase Project
- **URL:** https://qwotlnuhszatzifasngg.supabase.co
- **Migration:** Run `supabase/combined_migration.sql` in SQL Editor (already done)
- **Buckets:** videos (100MB), thumbnails (5MB), avatars (2MB)

## Tech Stack & Conventions
- React Native + Expo SDK 54 (managed workflow)
- Supabase (auth, Postgres DB, storage)
- TypeScript (strict mode)
- State: Zustand + TanStack React Query
- Video playback: expo-video
- Bottom sheets: @gorhom/bottom-sheet v5
- Gestures: react-native-gesture-handler + Reanimated
- Folder structure: Follow Expo Router pattern (app/(tabs)/, app/(modals)/, components/video/, hooks/, lib/, types/)
- Commits: Conventional Commits (feat:, fix:, refactor:, chore:, etc.)

## Workflow & Behavior Rules
- ALWAYS plan in detail (markdown) before writing code.
- Use subagents aggressively for parallel/independent tasks.
- Commit after each logical chunk with descriptive conventional message.
- After completing a feature or significant refactor, update CLAUDE.md to reflect the changes before committing.
- Proceed autonomously on routine file edits (acceptEdits enabled).
- Ask only on high-risk actions: Supabase schema changes, external API keys, destructive operations, permissions changes.
- Prefer readability + explicit code over clever/one-liners.
- No console.log in committed code.
- When spawning subagents: give clear roles/descriptions (e.g., "Supabase Specialist", "UI/Feed Engineer").

## Safety & Constraints
- Never delete code unless explicitly instructed or obviously dead/unused.
- Enforce agree_disagree boolean on response videos (parent_video_id not null).
- Video length: enforce 120s (2 min) max via duration_seconds.
- Use targeted tests (e.g., single file) instead of full suite for speed.

## Project Structure
```
LewReviews/
├── CLAUDE.md, README.md, .gitignore
├── supabase/migrations/        # 8 SQL migration files
├── lib/                        # Root auth.tsx, supabase.ts
├── types/                      # database.ts
└── mobile/
    ├── app/
    │   ├── (auth)/             # login, signup
    │   ├── (tabs)/             # feed, discover, create, profile
    │   ├── (modals)/           # response-upload (single-screen with stance picker), edit-profile
    │   ├── video/[id].tsx
    │   ├── profile/[id].tsx
    │   ├── followers/[id].tsx
    │   └── following/[id].tsx
    ├── components/video/       # VideoPlayer, VideoFeed, VideoCard, UploadForm, RepliesDrawer, ReplyListItem
    ├── components/             # ResponseChain, UserListItem
    ├── hooks/                  # useVideoUpload, useVideoFeed, useResponseChain, useFollow, useUserSearch, useFollowList, useSuggestedUsers
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
- Client-side video compression (see docs/COMPRESSION.md)
- Full edit-profile implementation
- Replace expo-av with expo-audio (deprecation warning in SDK 54)

## Resolved Issues
- Video uploads were 0 bytes (fetch→blob broken in RN; fixed with FileSystem.uploadAsync from expo-file-system/legacy)
- Avatar upload used atob() unavailable in RN (fixed with fetch→blob for Supabase SDK upload)
- .mov uploads rejected with 415 (Content-Type was video/mov; fixed to video/quicktime)
- Respond button showed "No video specified" (param name mismatch: parentVideoId vs videoId)
- Avatar button overlapped response indicator (moved to small inline avatar next to username in bottom left)
- Replaced likes system with agree/disagree counts (thumbs up/down per video based on responses)
- Profile page "Likes" stat replaced with "Ratio" (total agrees - total disagrees)
- Added Agreed/Disagreed tabs to profile showing videos user responded to
- Removed swipe gestures for navigation (conflicted with FlatList scrolling); use tap-based Replies button instead
- Removed tap-to-vote; video responses are now the ONLY way to agree/disagree
- Replaced thumbs icons with checkmark/X icons throughout the app
- Added consensus percentage display (e.g., "73% agree") on videos with responses
- Consolidated response flow into single screen: stance picker + video record/upload in one modal (removed agree-disagree intermediate screen)
- Share sheet no longer pauses/unpauses video (playback state saved before share sheet opens and restored on close)
- Profile layout: avatar and stats (Following/Followers/Ratio) now in same horizontal row (TikTok-style)
- Avatar tappable on profile pages with "+" badge (no avatar) or pencil badge (has avatar); uploads to Supabase inline, no avatar picker in edit-profile modal
- Edit profile simplified: single "Name" field (sets both username and display_name), bio only, no avatar section
- Redesigned post review and response upload flows with dark cinema aesthetic (amber/gold accent, animated record button, refined stance picker with press feedback, tighter typography)
- Avatar upload used fetch→blob which produced 0-byte files in RN; fixed with FileSystem.uploadAsync (same as video upload)
- Feed overlay (username, actions, progress bar) used hardcoded bottom offsets; now uses dynamic TAB_BAR_HEIGHT + insets.bottom for all iPhone models
- Avatar upload no longer invalidates feed query (caused spinner + scroll reset); uses setQueriesData to update cache in-place
- Profile stats row (Following/Followers/Ratio) uses equal-width flex columns so middle column is always centered
- Profile avatar camera badge no longer clipped (borderRadius moved to image, not container)
- Video detail Replies button now uses live response data from useResponseChain hook instead of stale denormalized responses_count; hidden when 0 replies, badge shows actual direct reply count, tap navigates to first reply
- Feed Replies button passes showReplies param so detail screen auto-navigates to first reply (no redundant intermediate screen)
- Video detail screen bottom offsets fixed: used insets.bottom + 30/16 instead of insets.bottom + 115/100 (no tab bar on stack screen)
- Added Discover tab (search users + suggested accounts), followers/following list screens, tappable follower/following stats on all profiles
- Tab bar order: Feed | Discover | Create (+) | Ranks | Profile
- Consensus percentage moved from right-side actions to top-left pill badge on feed and detail screens
- Global mute: mute/unmute persists across all videos via module-level state in VideoPlayer (toggleGlobalMute/getGlobalMuted exports)
- Tap-to-pause: VideoCard root changed from View to Pressable with onTap prop; child TouchableOpacity buttons take priority, background taps toggle play/pause
- Feed autoplay fix: share sheet effect was pausing videos on mount (wasPlayingBeforeShare initialized false triggered the "restore paused state" branch); fixed by tracking previous isShareSheetOpen value and only acting on open→closed transitions
- VideoPlayer no longer handles touch events or mute button; mute button lives in VideoFeed's VideoItem layer, play/pause exposed via onRegisterToggle callback
- Feed query staleTime set to 1 minute (prevents spinner on tab switches)
- Feed cache invalidated after video upload (new videos appear immediately)
- VideoPlayer buffering spinner no longer flashes on initial render
- Removed dead code: Like/VideoVote types, useVideoDetail hook, unused thumbnailUrl prop
- Performance: Replies button now fetches first response ID directly and navigates to it (eliminated double-load via showReplies auto-nav)
- Performance: Response counts combined from 2 sequential COUNT queries into 1 single query
- Performance: Parent video waterfall eliminated — parent_video_id passed from already-loaded video data
- Performance: Added 2-minute staleTime to all response chain queries (prevents refetch on re-navigation)
- Performance: Leaderboard friends tab reduced from 2 queries to 1 (uses Supabase JOIN via follows table)
- Performance: Leaderboard all tab now uses server-side ORDER BY instead of client-side sort
- Performance: Follow mutation invalidates on success only (not on error via onSettled)
- Performance: Video upload cache invalidation targeted to specific feed keys instead of blanket invalidation
- Performance: Video upload of responses now invalidates parent video's response chain cache
- Performance: Added database indexes for profiles(followers_count), follows(following_id, created_at), video_votes(user_id, video_id), videos(parent_video_id, status, visibility)
- Performance: Added vote_agree_count/vote_disagree_count to Video TypeScript type (was missing since migration 00006)
- VideoPlayer autoplay: replaced separate progress/playback effects with single 100ms polling interval that enforces play/pause and updates progress bar; setup callback always calls play()
- VideoFeed renderItem stabilized: activeIndex read from ref (not state) so renderItem identity doesn't change on scroll, preventing FlatList from unmounting/remounting cells and losing VideoCard overlays
- Post-upload navigation: both create and response-upload now navigate to /(tabs)/feed instead of showing alert dialog
- Tab bar: "Ranks" renamed to "Rank"
- Video detail screen overlay offsets matched to feed (uses TAB_BAR_HEIGHT instead of insets.bottom)
- Replies button now opens a bottom sheet drawer (RepliesDrawer) instead of navigating to first reply; shows all replies with avatar, username, stance, thumbnail, and relative timestamp; tapping a reply navigates to that video; uses @gorhom/bottom-sheet v5 with BottomSheetModal + BottomSheetFlatList; single drawer instance per screen (VideoFeed + video/[id]); VideoCard no longer imports supabase directly
- Replies button icon changed from chevron-forward to people (since it opens a drawer, not navigates forward)
- Feed videos now pause when switching to other tabs (Profile, Discover, Rank, Create); VideoFeed tracks tab focus via useFocusEffect and passes isFocused into isActive prop
- Flat reply architecture: all replies target the root video, no nested chains; Replies button hidden on response videos; Reply button on responses redirects to root video; response-upload resolves parentVideoId to root if it points to a response

## Post-MVP Roadmap (Prioritized)

### P1 — Viral Infrastructure
- Share button: Wire up native share sheet with deep links (expo-linking + universal links)
- Deep links: Video URLs that open directly in app or show web preview with OG tags
- Shareable debate cards: Auto-generated images showing consensus % for sharing on Twitter/X

### P2 — Double Down on Debates (Core Differentiator)
- Debate view: Split-screen showing original take vs top disagreement side-by-side
- ~~Consensus percentages: Show "73% agree" on videos — community polling mechanic~~ ✅ Done
- "Hot takes" feed: Surface videos with most polarizing agree/disagree ratios
- "Someone disagreed with your take" notification — #1 re-engagement hook

### P3 — Push Notifications
- Expo Notifications setup
- Triggers: new response to your video, new follower, someone disagreed with your take
- Supabase Edge Functions or webhook for server-side triggers

### P4 — Content Discovery
- TMDB integration: Tag reviews to movies/shows, pull posters + metadata
- Search: By movie title, creator username, or keywords
- Trending/categories: Browse by movie, genre, or what's being debated now
- Basic feed algorithm: Engagement-weighted "For You" tab vs chronological "Following" tab

### P5 — Video Compression
- Client-side compression before upload (FFmpeg or expo-video-codec)
- Required for scale — current MVP uploads original quality

### P6 — Engagement & Retention
- Text comments: Lower barrier than video responses, increases engagement
- Guided first review: Onboarding flow — "What movie did you watch recently?"
- Templates/prompts: "Hot or Not?", "Overhyped or Underhyped?", "Better than the original?"
- Gamification: Streaks, badges ("First to review [Movie]"), weekly leaderboard

### P7 — Polish
- Settings screen navigation
- Replace expo-av with expo-audio (deprecation warning)

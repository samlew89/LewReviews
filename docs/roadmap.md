# Post-MVP Roadmap

## P1 — Viral Infrastructure

- Share button: Wire up native share sheet with deep links (expo-linking + universal links)
- Deep links: Video URLs that open directly in app or show web preview with OG tags
- Shareable debate cards: Auto-generated images showing consensus % for sharing on Twitter/X

## P2 — Double Down on Debates (Core Differentiator)

- Debate view: Split-screen showing original take vs top disagreement side-by-side
- ~~Consensus percentages~~ ✅ Done
- "Hot takes" feed: Surface videos with most polarizing agree/disagree ratios
- "Someone disagreed with your take" notification — #1 re-engagement hook

## P3 — Push Notifications

- Expo Notifications setup
- Triggers: new response to your video, new follower, someone disagreed with your take
- Supabase Edge Functions or webhook for server-side triggers

## P4 — Content Discovery

- TMDB integration: Tag reviews to movies/shows, pull posters + metadata
- Search: By movie title, creator username, or keywords
- Trending/categories: Browse by movie, genre, or what's being debated now
- Basic feed algorithm: Engagement-weighted "For You" tab vs chronological "Following" tab

## P5 — Video Compression ✅

- ~~Client-side compression before upload~~ Done: react-native-compressor added

## P6 — Engagement & Retention

- Text comments: Lower barrier than video responses, increases engagement
- Guided first review: Onboarding flow — "What movie did you watch recently?"
- Templates/prompts: "Hot or Not?", "Overhyped or Underhyped?", "Better than the original?"
- Gamification: Streaks, badges ("First to review [Movie]"), weekly leaderboard

## P7 — Polish

- Settings screen navigation
- Replace expo-av with expo-audio (deprecation warning)

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

## P3 — Push Notifications ✅

- ~~Expo Notifications setup~~ Done
- ~~Triggers: new response to your video, new follower, someone disagreed with your take~~ Done
- ~~Supabase Edge Functions or webhook for server-side triggers~~ Done

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

## P8 — Design Polish (B+ → A Grade)

### Identity & Personality
- Signature gradient moments beyond the debate bar (podium glow, profile header, consensus visualizations)
- Per-screen "LewReviews moment" — Rank: animated flame on rising users, Profile: consensus breakdown arc (radial agree/disagree chart), Discover: "Most Debated This Week" heat-map visualization

### Density Without Clutter
- Profile header/banner area — blurred collage of top-rated movie posters behind avatar
- Taller trending cards on Discover (180-200px) with poster as full background (Netflix browse style)
- Real avatar images on Rank podium — empty circles kill the energy

### State Design
- Selected/active states everywhere — Agree button pulse glow, filled state with checkmark animation
- Empty states — Discover before following anyone, Profile with 0 reviews (first screens new users see)
- Loading skeletons — shimmer placeholders matching card shapes

### Typography Hierarchy
- Vary title weight/size relationships per screen (e.g. "Leaderboard" 24px + inline trophy icon)
- Section headers with bolder treatment — colored accent dot or line before "Trending Debates", "Hot Takes"

### Micro-interaction Hints
- Record button: ring progress fill as you record (partial stroke animation)
- Stance picker: faint ghost color on unselected option (red tint on disagree) to hint at function
- Tab bar: active tab subtle scale/bounce on tap (1.05x)

### Missing Screens
- Replies drawer — bottom sheet with video reply thumbnails, stance indicators, reply chain feel
- Video detail / single video view — overlay differences from feed when tapping from Profile grid

### Platform Fidelity
- Dynamic Island awareness on modern iPhones
- Haptic feedback zones — agree/disagree tap, record start, stance select (separates "looks nice" from "feels premium")

## P9 — Onboarding Polish (A- → A+)

### Additional Screens / Steps
- **Find friends from contacts** — contact book permission flow, match phone numbers/emails to existing users, "X friends are already here" social proof
- **Pick your genres** — select favorite genres (Action, Horror, Comedy, Sci-Fi, etc.) to seed the Discover feed with relevant content on first load
- **Record your first take** — guided "try it now" screen with a trending movie prompt ("What did you think of X?"), lowers the barrier to first post

### UI/UX Improvements
- Custom illustrations for welcome screen hero — animated film strip or debate visual instead of stock Lucide clapperboard icon
- Stagger-animate notification preview cards on screen 3 (slide in one by one)
- Welcome screen radiating rings: subtle pulse animation on loop
- Page transition: crossfade or slide with spring physics (react-native-reanimated), not default stack push
- Confetti or celebration moment after completing onboarding ("You're in!")
- Progress bar across top (alternative to dots) — shows how close to done, reduces abandonment
- "Follow all" bulk action button on Follow Reviewers screen
- Show mutual followers ("Followed by @moviebuff42") on follow suggestions for social proof

### Retention Hooks
- Personalized welcome push notification 1hr after signup — "Your feed is ready 🍿"
- Re-engagement if user skips follow step — prompt in Discover tab: "Follow reviewers to fill your feed"
- If user skips notifications — subtle badge on Settings gear after 3 sessions: "Turn on notifications"

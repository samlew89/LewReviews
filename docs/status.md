# Project Status

## MVP Core Complete ✅

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Supabase schema, auth, video feed, upload, response chains | ✅ |
| 2 | Auth UI, profile features, documentation | ✅ |
| 3 | Agree/disagree system, profile ratio stats | ✅ |
| 4 | Followers system, Discover tab, user search, suggested users | ✅ |

## Feature Status

- **Auth:** Working - signup/login functional, auto-redirects on auth state change
- **Upload:** Working - video upload to Supabase storage with compression
- **Feed:** Shows consensus percentage (e.g., "73% agree") - video responses only
- **Profile:** Shows Ratio (agrees - disagrees), Reviews + Replies tabs, settings menu
- **Discover:** Search users by username, suggested users (most followed), follow/unfollow inline
- **Follow Lists:** Tappable follower/following counts → paginated list screens
- **Leaderboard:** Top ratios for All users and Friends, trophy-colored top 3
- **Consensus:** Percentage badge in top left of video
- **Push Notifications:** New review from followed users, response notifications (requires dev build)
- **Rating System:** 5-tier rating picker on root videos (Trash/Meh/Average/Great/Fire). Responses stay agree/disagree only.
- **Biometric Auth:** Face ID / Touch ID for login. Prompts after first password login, toggle in Settings.
- **Movie Tagging:** TMDB search to tag reviews with movie/TV show. Displays title badge on videos.

## Known TODOs

### High Priority
- [ ] **Test follow/unfollow** - verify with second test account
- [ ] **Test push notifications** - requires dev build and Apple Developer account
- [ ] **Onboarding flow** - first-time user experience
- [ ] **Security review** - RLS policies, auth flows, input validation
- [ ] **Final QA testing** - full app walkthrough before release

### Before Launch
- [ ] **Deep links / share** - share video URLs that open in app
- [ ] **Report/block users** - required for App Store
- [ ] **Forgot password flow**

### Nice to Have
- [ ] **Empty states** - feed empty, no followers, etc.
- [ ] **Offline handling** - graceful errors when no connection

### Pre-TestFlight
- [x] Block users from responding to their own videos (prevents self-inflating ratio scores)
- [ ] Fill in Sentry DSN and PostHog key in .env for production
- [ ] Update eas.json submit section with Apple ID and App Store Connect ID
- [ ] App icon design
- [ ] App Store description and screenshots/videos
- [ ] Landing page video for lewreviews.app

### Polish
- [x] Settings screen navigation
- [ ] Profile page layout fixes (format/alignment issues)
- [ ] Keyboard cutoff fixes (profile, edit-profile forms)
- [ ] Agree/disagree buttons unselecting unexpectedly
- [ ] Full edit-profile implementation
- [ ] Upload review/reply screen polish
- [ ] Overall design polish from Figma
- [ ] Replace expo-av with expo-audio (deprecation warning in SDK 54)
- [ ] Register `lewreviews.app` domain (used in legal docs, will need for website/landing page)

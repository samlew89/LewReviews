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

## Known TODOs

### High Priority
- [ ] **Test follow/unfollow** - verify with second test account
- [x] **Push notifications** - notify when someone you follow posts a review/reply
- [ ] **Biometric auth** - Face ID / Touch ID for login
- [ ] **Onboarding flow** - first-time user experience

### Pre-TestFlight
- [x] Block users from responding to their own videos (prevents self-inflating ratio scores)
- [ ] Fill in Sentry DSN and PostHog key in .env for production
- [ ] Update eas.json submit section with Apple ID and App Store Connect ID

### Polish
- [x] Settings screen navigation
- [ ] Full edit-profile implementation
- [ ] Replace expo-av with expo-audio (deprecation warning in SDK 54)
- [ ] Register `lewreviews.app` domain (used in legal docs, will need for website/landing page)

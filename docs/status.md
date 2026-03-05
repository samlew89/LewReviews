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
- **Report/Block:** Report videos/users via "..." menu (stored in DB). Block users to hide all their content from feed.
- **Account Deletion:** Users can delete their account from within the app.
- **Onboarding:** 3-screen flow for new signups — welcome, follow reviewers, notification opt-in. AsyncStorage + DB backed.

## Known TODOs

### High Priority
- [ ] **Test follow/unfollow** - verify with second test account
- [ ] **Test push notifications** - requires dev build and Apple Developer account
- [x] **Onboarding flow** - 3-screen flow (welcome, follow reviewers, notifications), push notification prompt moved here
- [ ] **Security review** - RLS policies, auth flows, input validation
- [ ] **Final QA testing** - full app walkthrough before release

### App Store Requirements
- [x] **Report/block users** - "..." menu on videos: Report (saves to DB), Block User (hides their content)
- [x] **Account deletion** - functional in-app delete flow (Guideline 5.1.1)
- [ ] **Privacy Policy** - accessible in-app + linked in App Store Connect (covers video data, Supabase, PostHog, Sentry)
- [ ] **Terms of Service** - linked in-app
- [ ] **Content moderation policy** - link to content policy / community guidelines
- [ ] **Demo account** - provide Apple review team login credentials in App Store Connect review notes
- [ ] **Seed content / empty states** - feed must not look broken on first launch
- [ ] **Age rating declaration** - declare appropriate rating in App Store Connect

### Before Launch
- [ ] **Deep links / share** - share video URLs that open in app
- [x] **Forgot password flow** (needs `lewreviews://reset-password` added to Supabase Redirect URLs)

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

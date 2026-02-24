# LewReviews MVP Instructions

TikTok-style vertical video feed for movie/TV reviews. Users upload short review videos; responses are video-only replies requiring an agree/disagree stance. Response chains accessed via Replies button. Built with Expo + Supabase free tier.

## Critical Rules

- **Safety first:** Never delete code unless instructed. Ask before Supabase schema changes, destructive operations, or permissions changes.
- **Commits:** Stage files individually (`git add .` forbidden). Conventional Commits format.
- **Video constraints:** 120s max duration, agree_disagree required on responses.
- **No console.log** in committed code.

## Business Logic

- Responses = video-only (no text comments yet)
- Flat reply architecture: all replies target root video, no nested chains
- Consensus percentage shown on videos with responses
- Profile "Ratio" = total agrees − total disagrees

## Supabase (Dev)

- **URL:** https://qwotlnuhszatzifasngg.supabase.co
- **Buckets:** videos (100MB), thumbnails (5MB), avatars (2MB)
- Email confirmation DISABLED for dev

## Quick Commands

```bash
cd mobile && npm install
npx expo start          # Expo Go (scan QR)
npx expo start --ios    # iOS Simulator
npx expo start --tunnel # Tunnel mode
```

## Documentation

@docs/status.md
@docs/workflow.md
@docs/structure.md
@docs/quick-start.md
@docs/roadmap.md
@docs/changelog.md
@docs/troubleshooting.md

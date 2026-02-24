# Quick Start

## Installation

```bash
cd mobile
npm install
# .env already configured with Supabase credentials
```

## Running the App

### Option 1: Expo Go on Phone (recommended)

```bash
cd mobile
npx expo start
# QR code appears in terminal - scan with iPhone camera
# Phone and Mac must be on same WiFi
```

**Important:** QR code only shows in interactive terminal, NOT background processes.
If localhost:8081 shows the app instead of QR code, that's the web version.

### Option 2: iOS Simulator (requires Xcode)

```bash
xcode-select --install  # First time only
npx expo start --ios
```

### Option 3: Android Emulator (requires Android Studio)

```bash
npx expo start --android
```

### Option 4: Tunnel mode (WiFi issues)

```bash
npx expo start --tunnel
# Creates public URL, scan QR from terminal
```

## Supabase

- **Dev URL:** https://qwotlnuhszatzifasngg.supabase.co
- **Migration:** Run `supabase/combined_migration.sql` in SQL Editor (already done)
- **Buckets:** videos (100MB), thumbnails (5MB), avatars (2MB)
- Email confirmation DISABLED for dev

## Environment Variables

See `mobile/.env.example` for required variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN` (optional in dev)
- `EXPO_PUBLIC_POSTHOG_KEY` (optional in dev)

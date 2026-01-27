# LewReviews Mobile App

React Native mobile application built with Expo SDK 52.

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Xcode on macOS) or Android Emulator (Android Studio)
- Expo Go app for physical device testing

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Supabase credentials
```

### Environment Variables

Create a `.env` file with:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server with interactive menu |
| `npm run ios` | Start on iOS Simulator |
| `npm run android` | Start on Android Emulator |
| `npm run web` | Start in web browser |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

## Testing on Devices

### iOS Simulator (macOS only)

```bash
# Start with iOS Simulator
npm run ios

# Or press 'i' after running npm start
```

Requirements:
- macOS with Xcode installed
- iOS Simulator (included with Xcode)
- iOS 15.1+ required for expo-video

### Android Emulator

```bash
# Start with Android Emulator
npm run android

# Or press 'a' after running npm start
```

Requirements:
- Android Studio with emulator configured
- Android API 24+ (Android 7.0)

### Physical Device

1. Install **Expo Go** from App Store or Google Play
2. Run `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Development Build (Recommended for Production Features)

For features requiring native code (like video):

```bash
# Create development build
npx expo run:ios
npx expo run:android
```

## Project Structure

```
mobile/
├── app/                      # Expo Router pages
│   ├── _layout.tsx           # Root layout with providers
│   ├── (tabs)/               # Tab navigation
│   │   ├── _layout.tsx       # Tab bar configuration
│   │   ├── feed.tsx          # Video feed (home)
│   │   └── create.tsx        # Create new video
│   ├── (modals)/             # Modal screens
│   │   └── agree-disagree.tsx
│   └── video/
│       └── [id].tsx          # Video detail page
├── components/
│   ├── video/                # Video components
│   │   ├── VideoPlayer.tsx   # Video playback
│   │   ├── UploadForm.tsx    # Video upload
│   │   └── index.ts          # Exports
│   └── ResponseChain.tsx     # Response chain display
├── hooks/
│   ├── useResponseChain.ts   # Response chain logic
│   └── index.ts              # Hook exports
├── types/
│   └── index.ts              # TypeScript definitions
├── docs/
│   └── COMPRESSION.md        # Video compression docs
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~52.0.0 | Expo framework |
| `expo-video` | ~2.0.0 | Video playback |
| `expo-router` | ~4.0.0 | File-based navigation |
| `@shopify/flash-list` | ^2.0.0 | High-performance lists |
| `@tanstack/react-query` | ^5.51.0 | Server state |
| `zustand` | ^5.0.0 | Client state |
| `@supabase/supabase-js` | ^2.45.0 | Backend integration |

## Troubleshooting

### Metro bundler issues

```bash
# Clear cache and restart
npx expo start --clear
```

### iOS build issues

```bash
# Clean iOS build
cd ios && pod deintegrate && pod install
```

### Android build issues

```bash
# Clean Android build
cd android && ./gradlew clean
```

### expo-video not working in Expo Go

Some native features require a development build:

```bash
npx expo run:ios
# or
npx expo run:android
```

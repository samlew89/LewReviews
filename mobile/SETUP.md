# LewReviews Mobile - Expo Project Setup

## Quick Start

### 1. Create Expo App

```bash
# Using the latest Expo SDK with TypeScript template
npx create-expo-app@latest LewReviewsMobile --template expo-template-blank-typescript

# Navigate to project
cd LewReviewsMobile
```

### 2. Install Essential Dependencies

```bash
# Core Video & Media
npx expo install expo-video expo-image expo-av

# Navigation (Expo Router)
npx expo install expo-router expo-linking expo-constants expo-status-bar

# State Management & Data Fetching
npm install @tanstack/react-query zustand

# UI Components
npx expo install @shopify/flash-list react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated

# Supabase Integration
npm install @supabase/supabase-js

# Additional Utilities
npx expo install expo-secure-store expo-file-system expo-media-library

# Development
npm install -D @types/react @types/react-native typescript
```

### 3. Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-video` | Latest | Video playback (replaces deprecated expo-av) |
| `expo-image` | Latest | Optimized image loading for thumbnails |
| `expo-router` | v4+ | File-based navigation |
| `@shopify/flash-list` | v2+ | High-performance list rendering |
| `@tanstack/react-query` | v5+ | Server state management |
| `zustand` | v5+ | Client state management |
| `react-native-reanimated` | v3+ | Smooth animations |
| `@supabase/supabase-js` | v2+ | Backend integration |

### 4. Project Structure

```
mobile/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout
│   ├── (tabs)/                   # Tab navigation group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Feed tab (home)
│   │   ├── create.tsx            # Create video tab
│   │   └── profile.tsx           # Profile tab
│   ├── video/
│   │   └── [id].tsx              # Video detail page
│   └── auth/
│       ├── login.tsx
│       └── register.tsx
├── components/
│   ├── video/
│   │   ├── VideoPlayer.tsx       # Single video player
│   │   ├── VideoFeed.tsx         # Vertical feed
│   │   ├── VideoOverlay.tsx      # Like/comment/share UI
│   │   └── VideoThumbnail.tsx    # Thumbnail placeholder
│   └── ui/
│       ├── Button.tsx
│       └── Loading.tsx
├── hooks/
│   ├── useVideoFeed.ts           # Feed data fetching
│   ├── useVideoPlayer.ts         # Player state management
│   └── useAuth.ts                # Authentication
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── api.ts                    # API helpers
│   └── storage.ts                # Secure storage
├── stores/
│   └── feedStore.ts              # Zustand feed state
├── types/
│   └── index.ts                  # TypeScript definitions
├── constants/
│   └── config.ts                 # App constants
├── app.config.ts                 # Expo configuration
├── package.json
└── tsconfig.json
```

## Key Configuration Notes

- **Expo SDK 52+**: Required for `expo-video` (expo-av is deprecated)
- **New Architecture**: Enable Fabric for best FlashList v2 performance
- **iOS**: Requires iOS 15.1+ for expo-video
- **Android**: Requires API 24+ (Android 7.0)

## References

- [Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/)
- [Expo Router Tabs](https://docs.expo.dev/router/advanced/tabs/)
- [FlashList Documentation](https://shopify.github.io/flash-list/)
- [TanStack Query](https://tanstack.com/query/latest)

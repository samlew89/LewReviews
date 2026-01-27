# Video Compression Strategy for LewReviews

## Overview

Video compression is essential for optimal upload performance and storage costs. This document outlines the available approaches for Expo React Native projects.

## Current Implementation

**Status**: No client-side compression (uploads original quality)

The current `useVideoUpload` hook uploads videos in their original quality. This is suitable for MVP but should be enhanced for production.

## Compression Options

### Option 1: Server-Side Compression (Recommended for MVP)

**Approach**: Upload original video, process server-side with FFmpeg.

**Pros**:
- Works with Expo managed workflow
- No native modules required
- Consistent compression quality
- Can create multiple resolutions (adaptive streaming)

**Cons**:
- Higher initial upload bandwidth
- Longer processing time before video is ready
- Requires server infrastructure

**Implementation**:
```typescript
// Supabase Edge Function or separate backend
// Use FFmpeg for transcoding after upload
```

### Option 2: expo-video-thumbnails + Quality Selection (Current)

**Approach**: Use ImagePicker's quality option and rely on device encoding.

**Pros**:
- No additional dependencies
- Works with managed workflow

**Cons**:
- Limited control over compression
- Quality varies by device

**Current Implementation**:
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['videos'],
  quality: 0.7, // 0-1 scale (limited effect)
  videoMaxDuration: 180,
});
```

### Option 3: react-native-compressor (Requires Prebuild)

**Package**: `react-native-compressor`

**Pros**:
- Full control over compression settings
- Client-side processing
- Reduces upload size significantly

**Cons**:
- Requires `expo prebuild` (ejects from managed workflow)
- Native module maintenance
- Adds complexity

**Installation** (if prebuilding):
```bash
npx expo prebuild
npm install react-native-compressor
npx pod-install
```

**Usage**:
```typescript
import { Video } from 'react-native-compressor';

const compressedUri = await Video.compress(
  originalUri,
  {
    compressionMethod: 'auto',
    maxSize: 1920, // Max dimension
    bitrate: 2000000, // 2 Mbps
  },
  (progress) => {
    console.log('Compression Progress:', progress);
  }
);
```

### Option 4: FFmpegKit (Requires Prebuild)

**Package**: `ffmpeg-kit-react-native`

**Pros**:
- Full FFmpeg capabilities
- Maximum control over encoding
- Can add watermarks, trim, merge

**Cons**:
- Large package size (~40MB+)
- Requires prebuild
- Complex API

**Installation** (if prebuilding):
```bash
npx expo prebuild
npm install ffmpeg-kit-react-native
```

**Usage**:
```typescript
import { FFmpegKit } from 'ffmpeg-kit-react-native';

const command = `-i ${inputPath} -vcodec libx264 -crf 28 -preset fast -vf scale=1080:-2 ${outputPath}`;
const session = await FFmpegKit.execute(command);
```

### Option 5: Cloud Processing Services

**Services**: Cloudinary, Mux, AWS MediaConvert

**Pros**:
- No client-side processing
- Professional-grade transcoding
- CDN delivery included
- Adaptive bitrate streaming

**Cons**:
- Additional cost
- Vendor dependency
- Network round-trips

## Recommended Strategy by Phase

### Phase 1: MVP (Current)
- Upload original quality
- Limit max file size to 100MB
- Limit max duration to 3 minutes
- Accept longer upload times

### Phase 2: Enhanced MVP
- Add server-side compression via Supabase Edge Functions
- Create optimized versions post-upload
- Implement adaptive quality delivery

### Phase 3: Production
- Evaluate `react-native-compressor` with prebuild
- Implement client-side compression for:
  - Faster uploads
  - Reduced server load
  - Better user experience
- Keep server-side as fallback

## Duration Extraction

The `useVideoUpload` hook extracts `duration_seconds` from videos using:

1. **ImagePicker asset** - Returns duration in milliseconds
2. **expo-av Audio.Sound** - Fallback for URI-only videos
3. **Server-side extraction** - Final fallback during processing

```typescript
// Primary method (from ImagePicker)
const durationMs = asset.duration || 0;
const durationSeconds = Math.round(durationMs / 1000);

// Fallback (from expo-av)
const { status } = await Audio.Sound.createAsync({ uri });
if (status.isLoaded && status.durationMillis) {
  duration = Math.round(status.durationMillis / 1000);
}
```

## Thumbnail Generation

Thumbnails are generated using `expo-video-thumbnails`:

```typescript
import * as VideoThumbnails from 'expo-video-thumbnails';

const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
  videoUri,
  {
    time: 1000, // 1 second into video
    quality: 0.8,
  }
);
```

## File Size Estimation

After compression (if implemented), expected sizes:

| Duration | Original (1080p) | Compressed |
|----------|------------------|------------|
| 15 sec   | ~30 MB           | ~5-8 MB    |
| 60 sec   | ~120 MB          | ~15-25 MB  |
| 180 sec  | ~360 MB          | ~45-75 MB  |

## Implementation Checklist

- [x] Duration extraction from video metadata
- [x] Thumbnail generation
- [x] File size validation
- [x] Progress tracking
- [ ] Client-side compression (requires prebuild)
- [ ] Server-side compression pipeline
- [ ] Adaptive quality delivery
- [ ] Upload resumption for large files

## References

- [expo-image-picker docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [expo-video-thumbnails docs](https://docs.expo.dev/versions/latest/sdk/video-thumbnails/)
- [react-native-compressor](https://github.com/numandev1/react-native-compressor)
- [FFmpegKit](https://github.com/arthenica/ffmpeg-kit)

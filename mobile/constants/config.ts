// ============================================================================
// LewReviews Mobile - App Configuration Constants
// ============================================================================

// Supabase configuration - replace with your actual values
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Storage bucket names
export const STORAGE_BUCKETS = {
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  AVATARS: 'avatars',
} as const;

// Video constraints
export const VIDEO_CONSTRAINTS = {
  MAX_DURATION_SECONDS: 120, // 2 minutes max
  MIN_DURATION_SECONDS: 3,   // 3 seconds min
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB max
  SUPPORTED_FORMATS: ['mp4', 'mov', 'avi', 'webm'],
  DEFAULT_QUALITY: 'medium' as const,
} as const;

// Compression settings
export const COMPRESSION_SETTINGS = {
  // For expo-video-thumbnails
  THUMBNAIL_WIDTH: 720,
  THUMBNAIL_QUALITY: 0.8,

  // For FFmpeg (if using native compression)
  VIDEO_BITRATE: '2M',
  AUDIO_BITRATE: '128k',
  MAX_WIDTH: 1080,
  MAX_HEIGHT: 1920,
} as const;

// Title/Description constraints (matching DB)
export const CONTENT_CONSTRAINTS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
} as const;

// Response chain constraints
export const CHAIN_CONSTRAINTS = {
  MAX_DEPTH: 10,
} as const;

// API retry configuration
export const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  UPLOAD_TIMEOUT_MS: 300000, // 5 minutes
} as const;

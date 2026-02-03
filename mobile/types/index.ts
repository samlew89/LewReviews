// ============================================================================
// LewReviews Mobile - Type Definitions
// ============================================================================

// Video status enum matching database
export type VideoStatus = 'processing' | 'ready' | 'failed' | 'deleted';

// Video visibility enum matching database
export type VideoVisibility = 'public' | 'unlisted' | 'private';

// User profile type
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  followers_count: number;
  following_count: number;
  videos_count: number;
  likes_received_count: number;
  agrees_received_count: number;
  disagrees_received_count: number;
  created_at: string;
  updated_at: string;
}

// Video type matching database schema
export interface Video {
  id: string;
  user_id: string;
  parent_video_id: string | null;
  root_video_id: string | null;
  chain_depth: number;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  status: VideoStatus;
  visibility: VideoVisibility;
  views_count: number;
  likes_count: number;
  responses_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // Response-specific field (for agree/disagree)
  agree_disagree?: boolean | null;
}

// Feed video with user info (from view)
export interface FeedVideo extends Video {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  vote_agree_count: number;
  vote_disagree_count: number;
  // User's vote on this video (null if not voted)
  user_vote?: boolean | null;
}

// Video vote type
export interface VideoVote {
  id: string;
  user_id: string;
  video_id: string;
  vote: boolean; // true = agree, false = disagree
  created_at: string;
  updated_at: string;
}

// Video upload input
export interface VideoUploadInput {
  title: string;
  description?: string;
  parentVideoId?: string;
  agreeDisagree?: boolean;
  visibility?: VideoVisibility;
}

// Video metadata extracted from file
export interface VideoMetadata {
  uri: string;
  duration: number; // in seconds
  width: number;
  height: number;
  fileSize: number;
  mimeType?: string;
}

// Upload progress state
export interface UploadProgress {
  stage: 'idle' | 'picking' | 'recording' | 'extracting' | 'compressing' | 'generating_thumbnail' | 'uploading' | 'creating_record' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

// Upload result
export interface UploadResult {
  success: boolean;
  video?: Video;
  error?: string;
}

// Like type
export interface Like {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

// Follow type
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

-- ============================================================================
-- LewReviews MVP - Performance Indexes
-- Migration: 00008_performance_indexes.sql
-- Description: Adds missing indexes for common query patterns
-- ============================================================================

-- Discover tab: suggested users sorted by followers_count
CREATE INDEX IF NOT EXISTS idx_profiles_followers_count_desc
  ON public.profiles(followers_count DESC NULLS LAST);

-- Followers list: reverse lookup by following_id with pagination
CREATE INDEX IF NOT EXISTS idx_follows_following_id_created
  ON public.follows(following_id, created_at DESC);

-- Video votes: fast lookup for "did this user vote on this video"
CREATE INDEX IF NOT EXISTS idx_video_votes_user_video
  ON public.video_votes(user_id, video_id);

-- Videos: response queries filtered by parent + status + visibility
CREATE INDEX IF NOT EXISTS idx_videos_parent_status_visibility
  ON public.videos(parent_video_id, status, visibility)
  WHERE parent_video_id IS NOT NULL;

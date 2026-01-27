-- ============================================================================
-- LewReviews MVP - Add agree_disagree column for response stance
-- Migration: 00004_add_agree_disagree.sql
-- Description: Adds agree_disagree boolean to videos table for response chains
-- ============================================================================

-- Add agree_disagree column to videos table
-- true = agree with parent video
-- false = disagree with parent video
-- null = not a response (original video)
ALTER TABLE public.videos
ADD COLUMN agree_disagree BOOLEAN DEFAULT NULL;

-- Add constraint: responses must have a stance, non-responses must not
ALTER TABLE public.videos
ADD CONSTRAINT response_requires_stance CHECK (
    (parent_video_id IS NULL AND agree_disagree IS NULL) OR
    (parent_video_id IS NOT NULL AND agree_disagree IS NOT NULL)
);

-- Add comment for documentation
COMMENT ON COLUMN public.videos.agree_disagree IS 'Stance on parent video: true=agree, false=disagree, null for non-responses';

-- Create index for filtering responses by stance
CREATE INDEX idx_videos_agree_disagree ON public.videos(parent_video_id, agree_disagree)
    WHERE parent_video_id IS NOT NULL;

-- Update the feed_videos view to include agree_disagree
DROP VIEW IF EXISTS public.feed_videos;

CREATE OR REPLACE VIEW public.feed_videos AS
SELECT
    v.id,
    v.user_id,
    v.parent_video_id,
    v.root_video_id,
    v.chain_depth,
    v.agree_disagree,
    v.title,
    v.description,
    v.video_url,
    v.thumbnail_url,
    v.duration_seconds,
    v.views_count,
    v.likes_count,
    v.responses_count,
    v.created_at,
    v.published_at,
    p.username,
    p.display_name,
    p.avatar_url
FROM public.videos v
INNER JOIN public.profiles p ON v.user_id = p.id
WHERE v.status = 'ready' AND v.visibility = 'public';

-- Function to get response counts by stance
CREATE OR REPLACE FUNCTION public.get_response_counts(video_id UUID)
RETURNS TABLE (
    agree_count BIGINT,
    disagree_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE agree_disagree = true) AS agree_count,
        COUNT(*) FILTER (WHERE agree_disagree = false) AS disagree_count,
        COUNT(*) AS total_count
    FROM public.videos
    WHERE parent_video_id = get_response_counts.video_id
      AND status = 'ready'
      AND visibility = 'public';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_response_counts IS 'Returns agree/disagree/total counts for responses to a video';

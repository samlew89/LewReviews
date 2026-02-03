-- ============================================================================
-- LewReviews MVP - Add Agree/Disagree Counts to Feed View
-- Migration: 00005_add_agree_disagree_counts.sql
-- Description: Updates feed_videos view to include agree_count and disagree_count
-- ============================================================================

-- Drop and recreate the view with agree/disagree counts
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
    p.avatar_url,
    -- Count of responses that agree
    (SELECT COUNT(*) FROM public.videos r
     WHERE r.parent_video_id = v.id
     AND r.agree_disagree = true
     AND r.status = 'ready'
     AND r.visibility = 'public')::integer AS agree_count,
    -- Count of responses that disagree
    (SELECT COUNT(*) FROM public.videos r
     WHERE r.parent_video_id = v.id
     AND r.agree_disagree = false
     AND r.status = 'ready'
     AND r.visibility = 'public')::integer AS disagree_count
FROM public.videos v
INNER JOIN public.profiles p ON v.user_id = p.id
WHERE v.status = 'ready' AND v.visibility = 'public';

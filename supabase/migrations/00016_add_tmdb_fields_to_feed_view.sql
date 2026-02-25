-- Update feed_videos view to include TMDB fields
DROP VIEW IF EXISTS feed_videos;

CREATE VIEW feed_videos AS
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
    v.vote_agree_count,
    v.vote_disagree_count,
    v.rating,
    v.movie_title,
    v.tmdb_id,
    v.tmdb_media_type,
    v.created_at,
    v.published_at,
    p.username,
    p.display_name,
    p.avatar_url
FROM videos v
JOIN profiles p ON v.user_id = p.id
WHERE v.status = 'ready'::video_status
  AND v.visibility = 'public'::video_visibility;

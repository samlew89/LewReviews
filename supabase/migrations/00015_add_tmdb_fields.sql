-- Add TMDB fields for movie/show identification
ALTER TABLE videos
ADD COLUMN tmdb_id integer,
ADD COLUMN tmdb_media_type text CHECK (tmdb_media_type IN ('movie', 'tv'));

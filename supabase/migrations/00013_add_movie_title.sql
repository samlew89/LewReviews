-- Add movie_title column to videos table
-- Nullable because responses don't have it (they inherit from root video)
ALTER TABLE videos
ADD COLUMN movie_title text;

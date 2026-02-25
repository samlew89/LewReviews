-- Add rating column to videos table (1-5 scale: Trash/Meh/Average/Great/Fire)
-- Nullable because only root videos have ratings, responses do not
ALTER TABLE videos
ADD COLUMN rating smallint CHECK (rating >= 1 AND rating <= 5);

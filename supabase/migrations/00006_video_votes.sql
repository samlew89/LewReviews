-- ============================================================================
-- LewReviews MVP - Video Votes Table
-- Migration: 00006_video_votes.sql
-- Description: Adds voting system for agree/disagree on videos
-- ============================================================================

-- ============================================================================
-- VIDEO_VOTES TABLE
-- Tracks user agree/disagree votes on videos (separate from video responses)
-- ============================================================================
CREATE TABLE public.video_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL, -- true = agree, false = disagree
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- One vote per user per video
    CONSTRAINT unique_user_video_vote UNIQUE (user_id, video_id)
);

-- Indexes for video_votes
CREATE INDEX idx_video_votes_user_id ON public.video_votes(user_id);
CREATE INDEX idx_video_votes_video_id ON public.video_votes(video_id);
CREATE INDEX idx_video_votes_vote ON public.video_votes(video_id, vote);

-- Apply updated_at trigger
CREATE TRIGGER update_video_votes_updated_at
    BEFORE UPDATE ON public.video_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ADD VOTE COUNTS TO VIDEOS TABLE
-- ============================================================================
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS vote_agree_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS vote_disagree_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================================================
-- ADD RATIO STATS TO PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS agrees_received_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS disagrees_received_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================================================
-- TRIGGER FUNCTION: Update vote counts on insert/update/delete
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    video_owner_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get video owner
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;

        IF NEW.vote = true THEN
            -- Increment agree counts
            UPDATE public.videos SET vote_agree_count = vote_agree_count + 1 WHERE id = NEW.video_id;
            UPDATE public.profiles SET agrees_received_count = agrees_received_count + 1 WHERE id = video_owner_id;
        ELSE
            -- Increment disagree counts
            UPDATE public.videos SET vote_disagree_count = vote_disagree_count + 1 WHERE id = NEW.video_id;
            UPDATE public.profiles SET disagrees_received_count = disagrees_received_count + 1 WHERE id = video_owner_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Vote changed from disagree to agree or vice versa
        IF OLD.vote != NEW.vote THEN
            SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;

            IF NEW.vote = true THEN
                -- Changed to agree: decrement disagree, increment agree
                UPDATE public.videos SET vote_agree_count = vote_agree_count + 1, vote_disagree_count = GREATEST(0, vote_disagree_count - 1) WHERE id = NEW.video_id;
                UPDATE public.profiles SET agrees_received_count = agrees_received_count + 1, disagrees_received_count = GREATEST(0, disagrees_received_count - 1) WHERE id = video_owner_id;
            ELSE
                -- Changed to disagree: decrement agree, increment disagree
                UPDATE public.videos SET vote_disagree_count = vote_disagree_count + 1, vote_agree_count = GREATEST(0, vote_agree_count - 1) WHERE id = NEW.video_id;
                UPDATE public.profiles SET disagrees_received_count = disagrees_received_count + 1, agrees_received_count = GREATEST(0, agrees_received_count - 1) WHERE id = video_owner_id;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Get video owner
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;

        IF OLD.vote = true THEN
            -- Decrement agree counts
            UPDATE public.videos SET vote_agree_count = GREATEST(0, vote_agree_count - 1) WHERE id = OLD.video_id;
            UPDATE public.profiles SET agrees_received_count = GREATEST(0, agrees_received_count - 1) WHERE id = video_owner_id;
        ELSE
            -- Decrement disagree counts
            UPDATE public.videos SET vote_disagree_count = GREATEST(0, vote_disagree_count - 1) WHERE id = OLD.video_id;
            UPDATE public.profiles SET disagrees_received_count = GREATEST(0, disagrees_received_count - 1) WHERE id = video_owner_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.video_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vote_counts();

-- ============================================================================
-- UPDATE FEED_VIDEOS VIEW
-- Include vote counts from videos table
-- ============================================================================
DROP VIEW IF EXISTS public.feed_videos;

CREATE VIEW public.feed_videos AS
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
    v.created_at,
    v.published_at,
    p.username,
    p.display_name,
    p.avatar_url
FROM public.videos v
INNER JOIN public.profiles p ON v.user_id = p.id
WHERE v.status = 'ready' AND v.visibility = 'public';

-- ============================================================================
-- RLS POLICIES FOR VIDEO_VOTES
-- ============================================================================
ALTER TABLE public.video_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes (to see counts)
CREATE POLICY "Anyone can read video votes"
    ON public.video_votes FOR SELECT
    USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can insert own votes"
    ON public.video_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
    ON public.video_votes FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
    ON public.video_votes FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.video_votes IS 'User agree/disagree votes on videos';
COMMENT ON COLUMN public.video_votes.vote IS 'true = agree, false = disagree';

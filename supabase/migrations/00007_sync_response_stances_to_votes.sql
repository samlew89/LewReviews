-- ============================================================================
-- LewReviews MVP - Sync Response Stances to Votes
-- Migration: 00007_sync_response_stances_to_votes.sql
-- Description: When a user posts a response video with agree/disagree stance,
--              automatically create a vote in video_votes for the PARENT video.
--              This ensures response stances count toward vote tallies and stats.
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Sync response video stance to video_votes
-- When a response video is created/updated/deleted, sync to video_votes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_response_stance_to_votes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process response videos (those with a parent_video_id)
    -- and only when agree_disagree is set

    IF TG_OP = 'INSERT' THEN
        -- New response video created
        IF NEW.parent_video_id IS NOT NULL AND NEW.agree_disagree IS NOT NULL THEN
            -- Insert vote on the PARENT video (not the response itself)
            -- Use ON CONFLICT to handle race conditions
            INSERT INTO public.video_votes (user_id, video_id, vote)
            VALUES (NEW.user_id, NEW.parent_video_id, NEW.agree_disagree)
            ON CONFLICT (user_id, video_id)
            DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Response video updated - check if stance changed
        IF NEW.parent_video_id IS NOT NULL THEN
            IF OLD.agree_disagree IS DISTINCT FROM NEW.agree_disagree THEN
                IF NEW.agree_disagree IS NOT NULL THEN
                    -- Stance set or changed - upsert vote
                    INSERT INTO public.video_votes (user_id, video_id, vote)
                    VALUES (NEW.user_id, NEW.parent_video_id, NEW.agree_disagree)
                    ON CONFLICT (user_id, video_id)
                    DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();
                ELSE
                    -- Stance removed (set to NULL) - delete vote
                    DELETE FROM public.video_votes
                    WHERE user_id = NEW.user_id AND video_id = NEW.parent_video_id;
                END IF;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Response video deleted - remove the vote
        IF OLD.parent_video_id IS NOT NULL AND OLD.agree_disagree IS NOT NULL THEN
            DELETE FROM public.video_votes
            WHERE user_id = OLD.user_id AND video_id = OLD.parent_video_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on videos table
DROP TRIGGER IF EXISTS sync_response_stance_trigger ON public.videos;
CREATE TRIGGER sync_response_stance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_response_stance_to_votes();

-- ============================================================================
-- BACKFILL: Create votes for existing response videos
-- This ensures historical data is consistent
-- ============================================================================
INSERT INTO public.video_votes (user_id, video_id, vote)
SELECT
    v.user_id,
    v.parent_video_id,
    v.agree_disagree
FROM public.videos v
WHERE v.parent_video_id IS NOT NULL
  AND v.agree_disagree IS NOT NULL
  AND v.status = 'ready'
ON CONFLICT (user_id, video_id)
DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();

-- ============================================================================
-- COMMENT
-- ============================================================================
COMMENT ON FUNCTION public.sync_response_stance_to_votes() IS
'Automatically syncs response video agree/disagree stances to video_votes table.
When a user creates a response video with a stance, their vote is recorded on the parent video.';

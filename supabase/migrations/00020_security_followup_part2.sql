-- ============================================================================
-- Security Follow-Up Part 2
-- ============================================================================

-- Central helper for checking whether a viewer may interact with or inspect a
-- video's associated rows (likes, votes, etc.).
CREATE OR REPLACE FUNCTION public.can_access_video(target_video_id UUID, viewer_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_video public.videos%ROWTYPE;
BEGIN
    SELECT *
    INTO target_video
    FROM public.videos
    WHERE id = target_video_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF viewer_id IS NOT NULL AND viewer_id = target_video.user_id THEN
        RETURN TRUE;
    END IF;

    IF target_video.status <> 'ready' THEN
        RETURN FALSE;
    END IF;

    IF target_video.visibility NOT IN ('public', 'unlisted') THEN
        RETURN FALSE;
    END IF;

    IF viewer_id IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN NOT public.users_are_blocked(viewer_id, target_video.user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_video(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_video(UUID, UUID) TO anon;

-- Validate like targets before insert/update and protect the SECURITY DEFINER
-- RPC from writing against inaccessible videos.
CREATE OR REPLACE FUNCTION public.validate_like_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.can_access_video(NEW.video_id, NEW.user_id) THEN
        RAISE EXCEPTION 'Cannot like an inaccessible video';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_like_write_trigger ON public.likes;
CREATE TRIGGER validate_like_write_trigger
    BEFORE INSERT OR UPDATE ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_like_write();

-- Validate direct vote writes the same way.
CREATE OR REPLACE FUNCTION public.validate_video_vote_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.can_access_video(NEW.video_id, NEW.user_id) THEN
        RAISE EXCEPTION 'Cannot vote on an inaccessible video';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_video_vote_write_trigger ON public.video_votes;
CREATE TRIGGER validate_video_vote_write_trigger
    BEFORE INSERT OR UPDATE ON public.video_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_video_vote_write();

-- Restrict likes reads to videos the caller can actually access.
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable when target video is accessible"
    ON public.likes
    FOR SELECT
    USING (public.can_access_video(video_id, auth.uid()));

-- Restrict vote reads to videos the caller can actually access.
DROP POLICY IF EXISTS "Anyone can read video votes" ON public.video_votes;
CREATE POLICY "Video votes are viewable when target video is accessible"
    ON public.video_votes
    FOR SELECT
    USING (public.can_access_video(video_id, auth.uid()));

-- Prevent direct vote writes against inaccessible videos at the policy layer too.
DROP POLICY IF EXISTS "Users can insert own votes" ON public.video_votes;
CREATE POLICY "Users can insert own votes on accessible videos"
    ON public.video_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_video(video_id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own votes" ON public.video_votes;
CREATE POLICY "Users can update own votes on accessible videos"
    ON public.video_votes
    FOR UPDATE
    USING (
        auth.uid() = user_id
        AND public.can_access_video(video_id, auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_video(video_id, auth.uid())
    );

-- Likewise for likes.
DROP POLICY IF EXISTS "Authenticated users can like videos" ON public.likes;
CREATE POLICY "Authenticated users can like accessible videos"
    ON public.likes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_video(video_id, auth.uid())
    );

-- Make follow graph reads block-aware.
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable when not blocked"
    ON public.follows
    FOR SELECT
    USING (
        auth.uid() IS NULL
        OR (
            NOT public.users_are_blocked(auth.uid(), follower_id)
            AND NOT public.users_are_blocked(auth.uid(), following_id)
        )
    );

-- Harden the like RPC so it cannot mutate inaccessible videos even if the row
-- policy is bypassed through SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.toggle_like(video_id UUID)
RETURNS boolean AS $$
DECLARE
    already_liked boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.can_access_video(toggle_like.video_id, auth.uid()) THEN
        RAISE EXCEPTION 'Cannot like an inaccessible video';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.likes
        WHERE likes.video_id = toggle_like.video_id
          AND likes.user_id = auth.uid()
    ) INTO already_liked;

    IF already_liked THEN
        DELETE FROM public.likes
        WHERE likes.video_id = toggle_like.video_id
          AND likes.user_id = auth.uid();
        RETURN false;
    ELSE
        INSERT INTO public.likes (user_id, video_id)
        VALUES (auth.uid(), toggle_like.video_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- Security Follow-Up Hardening
-- ============================================================================

-- Helper for block-aware checks that must bypass blocked_users RLS.
CREATE OR REPLACE FUNCTION public.users_are_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.blocked_users bu
        WHERE (bu.user_id = user_a AND bu.blocked_user_id = user_b)
           OR (bu.user_id = user_b AND bu.blocked_user_id = user_a)
    );
$$;

GRANT EXECUTE ON FUNCTION public.users_are_blocked(UUID, UUID) TO authenticated;

-- Enforce response targets at write time so private/unready/nested videos cannot
-- be used for side effects such as votes or notifications.
CREATE OR REPLACE FUNCTION public.validate_video_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    parent_record public.videos%ROWTYPE;
BEGIN
    IF NEW.parent_video_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT *
    INTO parent_record
    FROM public.videos
    WHERE id = NEW.parent_video_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent video not found';
    END IF;

    IF parent_record.parent_video_id IS NOT NULL THEN
        RAISE EXCEPTION 'Responses may only target root videos';
    END IF;

    IF parent_record.status <> 'ready' OR parent_record.visibility <> 'public' THEN
        RAISE EXCEPTION 'Responses may only target public ready videos';
    END IF;

    IF public.users_are_blocked(NEW.user_id, parent_record.user_id) THEN
        RAISE EXCEPTION 'Cannot interact with a blocked user';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_video_write_trigger ON public.videos;
CREATE TRIGGER validate_video_write_trigger
    BEFORE INSERT OR UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_video_write();

-- Prevent follows between blocked users, including the SECURITY DEFINER RPC.
CREATE OR REPLACE FUNCTION public.validate_follow_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.users_are_blocked(NEW.follower_id, NEW.following_id) THEN
        RAISE EXCEPTION 'Cannot follow a blocked user';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_follow_write_trigger ON public.follows;
CREATE TRIGGER validate_follow_write_trigger
    BEFORE INSERT OR UPDATE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_follow_write();

-- Make reads block-aware for authenticated users while preserving self-access.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable when not blocked"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IS NULL
        OR auth.uid() = id
        OR NOT public.users_are_blocked(auth.uid(), id)
    );

DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
CREATE POLICY "Public videos are viewable when not blocked"
    ON public.videos
    FOR SELECT
    USING (
        visibility = 'public'
        AND status = 'ready'
        AND (
            auth.uid() IS NULL
            OR auth.uid() = user_id
            OR NOT public.users_are_blocked(auth.uid(), user_id)
        )
    );

DROP POLICY IF EXISTS "Unlisted videos are viewable with direct link" ON public.videos;
CREATE POLICY "Unlisted videos are viewable with direct link when not blocked"
    ON public.videos
    FOR SELECT
    USING (
        visibility = 'unlisted'
        AND status = 'ready'
        AND (
            auth.uid() IS NULL
            OR auth.uid() = user_id
            OR NOT public.users_are_blocked(auth.uid(), user_id)
        )
    );

-- Restrict notification fan-out to public content only, and skip blocked pairs.
CREATE OR REPLACE FUNCTION public.queue_video_notifications()
RETURNS TRIGGER AS $$
DECLARE
    follower_record RECORD;
    video_owner_id UUID;
    sender_username TEXT;
BEGIN
    IF NEW.visibility <> 'public' THEN
        RETURN NEW;
    END IF;

    SELECT username INTO sender_username FROM profiles WHERE id = NEW.user_id;

    IF NEW.parent_video_id IS NULL THEN
        FOR follower_record IN
            SELECT follower_id FROM follows WHERE following_id = NEW.user_id
        LOOP
            IF NOT public.users_are_blocked(NEW.user_id, follower_record.follower_id) THEN
                INSERT INTO notifications (recipient_id, sender_id, type, video_id, title, body)
                VALUES (
                    follower_record.follower_id,
                    NEW.user_id,
                    'new_review',
                    NEW.id,
                    'New Review',
                    sender_username || ' posted a new review: ' || NEW.title
                );
            END IF;
        END LOOP;
    ELSE
        SELECT user_id INTO video_owner_id FROM videos WHERE id = NEW.parent_video_id;

        IF video_owner_id IS NOT NULL
           AND video_owner_id != NEW.user_id
           AND NOT public.users_are_blocked(NEW.user_id, video_owner_id) THEN
            INSERT INTO notifications (recipient_id, sender_id, type, video_id, title, body)
            VALUES (
                video_owner_id,
                NEW.user_id,
                'response',
                NEW.id,
                CASE WHEN NEW.agree_disagree THEN 'Someone agreed!' ELSE 'Someone disagreed!' END,
                sender_username || CASE WHEN NEW.agree_disagree THEN ' agreed with ' ELSE ' disagreed with ' END || 'your take'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Only public, ready responses should influence vote tallies.
CREATE OR REPLACE FUNCTION public.sync_response_stance_to_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    old_counts BOOLEAN;
    new_counts BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        new_counts := NEW.parent_video_id IS NOT NULL
            AND NEW.agree_disagree IS NOT NULL
            AND NEW.status = 'ready'
            AND NEW.visibility = 'public';

        IF new_counts THEN
            INSERT INTO public.video_votes (user_id, video_id, vote)
            VALUES (NEW.user_id, NEW.parent_video_id, NEW.agree_disagree)
            ON CONFLICT (user_id, video_id)
            DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        old_counts := OLD.parent_video_id IS NOT NULL
            AND OLD.agree_disagree IS NOT NULL
            AND OLD.status = 'ready'
            AND OLD.visibility = 'public';
        new_counts := NEW.parent_video_id IS NOT NULL
            AND NEW.agree_disagree IS NOT NULL
            AND NEW.status = 'ready'
            AND NEW.visibility = 'public';

        IF old_counts AND (
            NOT new_counts
            OR OLD.parent_video_id IS DISTINCT FROM NEW.parent_video_id
        ) THEN
            DELETE FROM public.video_votes
            WHERE user_id = OLD.user_id
              AND video_id = OLD.parent_video_id;
        END IF;

        IF new_counts THEN
            INSERT INTO public.video_votes (user_id, video_id, vote)
            VALUES (NEW.user_id, NEW.parent_video_id, NEW.agree_disagree)
            ON CONFLICT (user_id, video_id)
            DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();
        END IF;

        RETURN NEW;
    END IF;

    old_counts := OLD.parent_video_id IS NOT NULL
        AND OLD.agree_disagree IS NOT NULL
        AND OLD.status = 'ready'
        AND OLD.visibility = 'public';

    IF old_counts THEN
        DELETE FROM public.video_votes
        WHERE user_id = OLD.user_id
          AND video_id = OLD.parent_video_id;
    END IF;

    RETURN OLD;
END;
$$;

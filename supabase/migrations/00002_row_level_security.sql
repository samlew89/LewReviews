-- ============================================================================
-- LewReviews MVP - Row Level Security Policies
-- Migration: 00002_row_level_security.sql
-- Description: Defines RLS policies for secure data access
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles (for displaying user info on videos)
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles
    FOR SELECT
    USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can only delete their own profile (cascade will handle related data)
CREATE POLICY "Users can delete their own profile"
    ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Profile creation is handled by trigger on auth.users insert
-- No direct insert policy needed for regular users

-- ============================================================================
-- VIDEOS POLICIES
-- ============================================================================

-- Anyone can view public, ready videos
CREATE POLICY "Public videos are viewable by everyone"
    ON public.videos
    FOR SELECT
    USING (
        visibility = 'public' AND status = 'ready'
    );

-- Users can view their own videos regardless of status/visibility
CREATE POLICY "Users can view their own videos"
    ON public.videos
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view unlisted videos if they have the direct link
-- (This is handled by the public policy check - unlisted requires knowing the ID)
CREATE POLICY "Unlisted videos are viewable with direct link"
    ON public.videos
    FOR SELECT
    USING (
        visibility = 'unlisted' AND status = 'ready'
    );

-- Authenticated users can insert videos
CREATE POLICY "Authenticated users can create videos"
    ON public.videos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- Users can update their own videos
CREATE POLICY "Users can update their own videos"
    ON public.videos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
    ON public.videos
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- LIKES POLICIES
-- ============================================================================

-- Anyone can see likes (for counting, showing who liked, etc.)
CREATE POLICY "Likes are viewable by everyone"
    ON public.likes
    FOR SELECT
    USING (true);

-- Authenticated users can like videos
CREATE POLICY "Authenticated users can like videos"
    ON public.likes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

-- Users can only unlike their own likes
CREATE POLICY "Users can remove their own likes"
    ON public.likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- No update policy - likes shouldn't be updated, only created/deleted

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

-- Anyone can see follows (for follower counts, lists, etc.)
CREATE POLICY "Follows are viewable by everyone"
    ON public.follows
    FOR SELECT
    USING (true);

-- Authenticated users can follow others
CREATE POLICY "Authenticated users can follow others"
    ON public.follows
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = follower_id AND
        auth.uid() != following_id  -- Can't follow yourself
    );

-- Users can only unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
    ON public.follows
    FOR DELETE
    USING (auth.uid() = follower_id);

-- No update policy - follows shouldn't be updated, only created/deleted

-- ============================================================================
-- HELPER POLICIES FOR SERVICE ROLE
-- These allow the service role to bypass RLS for backend operations
-- ============================================================================

-- Note: Service role automatically bypasses RLS, but we can create
-- specific policies for edge functions if needed

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- Functions that need elevated privileges
-- ============================================================================

-- Function to increment view count (bypasses RLS for counters)
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET views_count = views_count + 1
    WHERE id = video_id
      AND status = 'ready'
      AND visibility IN ('public', 'unlisted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_video_views(UUID) TO authenticated;

-- Function to check if user has liked a video
CREATE OR REPLACE FUNCTION public.has_user_liked_video(video_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.likes
        WHERE likes.video_id = has_user_liked_video.video_id
          AND likes.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_user_liked_video(UUID) TO authenticated;

-- Function to check if user is following another user
CREATE OR REPLACE FUNCTION public.is_user_following(target_user_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.follows
        WHERE follows.follower_id = auth.uid()
          AND follows.following_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_following(UUID) TO authenticated;

-- Function to toggle like (like if not liked, unlike if liked)
CREATE OR REPLACE FUNCTION public.toggle_like(video_id UUID)
RETURNS boolean AS $$
DECLARE
    already_liked boolean;
BEGIN
    -- Check if already liked
    SELECT EXISTS (
        SELECT 1 FROM public.likes
        WHERE likes.video_id = toggle_like.video_id
          AND likes.user_id = auth.uid()
    ) INTO already_liked;

    IF already_liked THEN
        -- Unlike
        DELETE FROM public.likes
        WHERE likes.video_id = toggle_like.video_id
          AND likes.user_id = auth.uid();
        RETURN false;
    ELSE
        -- Like
        INSERT INTO public.likes (user_id, video_id)
        VALUES (auth.uid(), toggle_like.video_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_like(UUID) TO authenticated;

-- Function to toggle follow
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id UUID)
RETURNS boolean AS $$
DECLARE
    already_following boolean;
BEGIN
    -- Can't follow yourself
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Cannot follow yourself';
    END IF;

    -- Check if already following
    SELECT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follows.follower_id = auth.uid()
          AND follows.following_id = target_user_id
    ) INTO already_following;

    IF already_following THEN
        -- Unfollow
        DELETE FROM public.follows
        WHERE follows.follower_id = auth.uid()
          AND follows.following_id = target_user_id;
        RETURN false;
    ELSE
        -- Follow
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (auth.uid(), target_user_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID) TO authenticated;

-- ============================================================================
-- LewReviews MVP - Initial Database Schema
-- Migration: 00001_initial_schema.sql
-- Description: Creates core tables for video review app with response chains
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES TABLE
-- Extends auth.users with app-specific user data
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,

    -- Stats (denormalized for performance)
    followers_count INTEGER DEFAULT 0 NOT NULL,
    following_count INTEGER DEFAULT 0 NOT NULL,
    videos_count INTEGER DEFAULT 0 NOT NULL,
    likes_received_count INTEGER DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 50),
    CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500)
);

-- Indexes for profiles
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- ============================================================================
-- VIDEOS TABLE
-- Core content table with support for response chains via parent_video_id
-- ============================================================================
CREATE TYPE video_status AS ENUM ('processing', 'ready', 'failed', 'deleted');
CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'private');

CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Response chain support
    parent_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    root_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    chain_depth INTEGER DEFAULT 0 NOT NULL,
    agree_disagree BOOLEAN,  -- Required when parent_video_id IS NOT NULL (true=agree, false=disagree)

    -- Content
    title TEXT NOT NULL,
    description TEXT,

    -- Media URLs (stored in Supabase Storage)
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Video metadata
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,

    -- Status and visibility
    status video_status DEFAULT 'processing' NOT NULL,
    visibility video_visibility DEFAULT 'public' NOT NULL,

    -- Stats (denormalized for performance)
    views_count INTEGER DEFAULT 0 NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    responses_count INTEGER DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    published_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 2000),
    CONSTRAINT chain_depth_limit CHECK (chain_depth >= 0 AND chain_depth <= 10),
    CONSTRAINT valid_dimensions CHECK (
        (width IS NULL AND height IS NULL) OR
        (width > 0 AND height > 0)
    ),
    -- Response videos must have a stance (agree/disagree), root videos must not
    CONSTRAINT response_requires_stance CHECK (
        (parent_video_id IS NULL AND agree_disagree IS NULL) OR
        (parent_video_id IS NOT NULL AND agree_disagree IS NOT NULL)
    )
);

-- Indexes for videos
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_parent_video_id ON public.videos(parent_video_id) WHERE parent_video_id IS NOT NULL;
CREATE INDEX idx_videos_root_video_id ON public.videos(root_video_id) WHERE root_video_id IS NOT NULL;
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_visibility ON public.videos(visibility);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_published_at ON public.videos(published_at DESC) WHERE published_at IS NOT NULL;

-- Composite index for feed queries (public, ready videos sorted by date)
CREATE INDEX idx_videos_feed ON public.videos(created_at DESC)
    WHERE status = 'ready' AND visibility = 'public';

-- Index for user's videos
CREATE INDEX idx_videos_user_feed ON public.videos(user_id, created_at DESC)
    WHERE status = 'ready';

-- ============================================================================
-- LIKES TABLE
-- Tracks user likes on videos
-- ============================================================================
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate likes
    CONSTRAINT unique_user_video_like UNIQUE (user_id, video_id)
);

-- Indexes for likes
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_likes_video_id ON public.likes(video_id);
CREATE INDEX idx_likes_created_at ON public.likes(created_at DESC);

-- ============================================================================
-- FOLLOWS TABLE (Optional for MVP but included for completeness)
-- Tracks follower/following relationships
-- ============================================================================
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent self-follows and duplicate follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Indexes for follows
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);
CREATE INDEX idx_follows_created_at ON public.follows(created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply updated_at trigger to videos
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to set root_video_id and chain_depth for response videos
CREATE OR REPLACE FUNCTION public.set_video_chain_info()
RETURNS TRIGGER AS $$
DECLARE
    parent_root UUID;
    parent_depth INTEGER;
BEGIN
    IF NEW.parent_video_id IS NOT NULL THEN
        -- Get parent's root and depth
        SELECT root_video_id, chain_depth INTO parent_root, parent_depth
        FROM public.videos
        WHERE id = NEW.parent_video_id;

        -- Set root_video_id (parent's root, or parent if parent is root)
        NEW.root_video_id := COALESCE(parent_root, NEW.parent_video_id);

        -- Set chain_depth
        NEW.chain_depth := COALESCE(parent_depth, 0) + 1;
    ELSE
        -- This is a root video
        NEW.root_video_id := NULL;
        NEW.chain_depth := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply chain info trigger to videos
CREATE TRIGGER set_video_chain_info_trigger
    BEFORE INSERT ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_video_chain_info();

-- Function to increment responses_count on parent video
CREATE OR REPLACE FUNCTION public.increment_responses_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_video_id IS NOT NULL THEN
        UPDATE public.videos
        SET responses_count = responses_count + 1
        WHERE id = NEW.parent_video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_responses_count_trigger
    AFTER INSERT ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_responses_count();

-- Function to decrement responses_count on parent video
CREATE OR REPLACE FUNCTION public.decrement_responses_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_video_id IS NOT NULL THEN
        UPDATE public.videos
        SET responses_count = GREATEST(0, responses_count - 1)
        WHERE id = OLD.parent_video_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_responses_count_trigger
    AFTER DELETE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_responses_count();

-- Function to update profile videos_count
CREATE OR REPLACE FUNCTION public.update_profile_videos_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles
        SET videos_count = videos_count + 1
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles
        SET videos_count = GREATEST(0, videos_count - 1)
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_videos_count_trigger
    AFTER INSERT OR DELETE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profile_videos_count();

-- Function to update like counts
CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS TRIGGER AS $$
DECLARE
    video_owner_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get video owner
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;

        -- Increment video likes_count
        UPDATE public.videos
        SET likes_count = likes_count + 1
        WHERE id = NEW.video_id;

        -- Increment profile likes_received_count
        UPDATE public.profiles
        SET likes_received_count = likes_received_count + 1
        WHERE id = video_owner_id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Get video owner
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;

        -- Decrement video likes_count
        UPDATE public.videos
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.video_id;

        -- Decrement profile likes_received_count
        UPDATE public.profiles
        SET likes_received_count = GREATEST(0, likes_received_count - 1)
        WHERE id = video_owner_id;

        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_like_counts();

-- Function to update follow counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower's following_count
        UPDATE public.profiles
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;

        -- Increment following's followers_count
        UPDATE public.profiles
        SET followers_count = followers_count + 1
        WHERE id = NEW.following_id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower's following_count
        UPDATE public.profiles
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = OLD.follower_id;

        -- Decrement following's followers_count
        UPDATE public.profiles
        SET followers_count = GREATEST(0, followers_count - 1)
        WHERE id = OLD.following_id;

        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_counts();

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        -- Generate username from email (before @) with random suffix
        LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
        -- Use raw_user_meta_data for display name if available
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        -- Use avatar from OAuth if available
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPER FUNCTIONS FOR QUERYING
-- ============================================================================

-- Function to get video response chain
CREATE OR REPLACE FUNCTION public.get_video_chain(video_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    parent_video_id UUID,
    title TEXT,
    thumbnail_url TEXT,
    chain_depth INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE chain AS (
        -- Start with the given video
        SELECT v.id, v.user_id, v.parent_video_id, v.title, v.thumbnail_url, v.chain_depth, v.created_at
        FROM public.videos v
        WHERE v.id = get_video_chain.video_id

        UNION ALL

        -- Get all ancestors
        SELECT v.id, v.user_id, v.parent_video_id, v.title, v.thumbnail_url, v.chain_depth, v.created_at
        FROM public.videos v
        INNER JOIN chain c ON v.id = c.parent_video_id
    )
    SELECT * FROM chain ORDER BY chain.chain_depth ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get direct responses to a video
CREATE OR REPLACE FUNCTION public.get_video_responses(
    video_id UUID,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    thumbnail_url TEXT,
    likes_count INTEGER,
    responses_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.user_id, v.title, v.thumbnail_url, v.likes_count, v.responses_count, v.created_at
    FROM public.videos v
    WHERE v.parent_video_id = get_video_responses.video_id
      AND v.status = 'ready'
      AND v.visibility = 'public'
    ORDER BY v.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for public feed videos with user info
CREATE OR REPLACE VIEW public.feed_videos AS
SELECT
    v.id,
    v.user_id,
    v.parent_video_id,
    v.root_video_id,
    v.chain_depth,
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
    p.avatar_url
FROM public.videos v
INNER JOIN public.profiles p ON v.user_id = p.id
WHERE v.status = 'ready' AND v.visibility = 'public';

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with app-specific data';
COMMENT ON TABLE public.videos IS 'Video content with support for response chains';
COMMENT ON TABLE public.likes IS 'User likes on videos';
COMMENT ON TABLE public.follows IS 'Follower/following relationships between users';
COMMENT ON COLUMN public.videos.parent_video_id IS 'Reference to parent video for response chains';
COMMENT ON COLUMN public.videos.root_video_id IS 'Reference to the root/original video in a chain';
COMMENT ON COLUMN public.videos.chain_depth IS 'Depth in the response chain (0 = original, 1 = first response, etc.)';

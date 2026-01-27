-- ============================================================================
-- LewReviews MVP - Combined Migration
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    followers_count INTEGER DEFAULT 0 NOT NULL,
    following_count INTEGER DEFAULT 0 NOT NULL,
    videos_count INTEGER DEFAULT 0 NOT NULL,
    likes_received_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 50),
    CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500)
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
CREATE TYPE video_status AS ENUM ('processing', 'ready', 'failed', 'deleted');
CREATE TYPE video_visibility AS ENUM ('public', 'unlisted', 'private');

CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    root_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    chain_depth INTEGER DEFAULT 0 NOT NULL,
    agree_disagree BOOLEAN,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    status video_status DEFAULT 'processing' NOT NULL,
    visibility video_visibility DEFAULT 'public' NOT NULL,
    views_count INTEGER DEFAULT 0 NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    responses_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    published_at TIMESTAMPTZ,
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 2000),
    CONSTRAINT chain_depth_limit CHECK (chain_depth >= 0 AND chain_depth <= 10),
    CONSTRAINT valid_dimensions CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)),
    CONSTRAINT response_requires_stance CHECK (
        (parent_video_id IS NULL AND agree_disagree IS NULL) OR
        (parent_video_id IS NOT NULL AND agree_disagree IS NOT NULL)
    )
);

CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_parent_video_id ON public.videos(parent_video_id) WHERE parent_video_id IS NOT NULL;
CREATE INDEX idx_videos_root_video_id ON public.videos(root_video_id) WHERE root_video_id IS NOT NULL;
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_visibility ON public.videos(visibility);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_published_at ON public.videos(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_videos_feed ON public.videos(created_at DESC) WHERE status = 'ready' AND visibility = 'public';
CREATE INDEX idx_videos_user_feed ON public.videos(user_id, created_at DESC) WHERE status = 'ready';
CREATE INDEX idx_videos_agree_disagree ON public.videos(parent_video_id, agree_disagree) WHERE parent_video_id IS NOT NULL;

-- ============================================================================
-- LIKES TABLE
-- ============================================================================
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_video_like UNIQUE (user_id, video_id)
);

CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_likes_video_id ON public.likes(video_id);
CREATE INDEX idx_likes_created_at ON public.likes(created_at DESC);

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);
CREATE INDEX idx_follows_created_at ON public.follows(created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_video_chain_info()
RETURNS TRIGGER AS $$
DECLARE
    parent_root UUID;
    parent_depth INTEGER;
BEGIN
    IF NEW.parent_video_id IS NOT NULL THEN
        SELECT root_video_id, chain_depth INTO parent_root, parent_depth
        FROM public.videos WHERE id = NEW.parent_video_id;
        NEW.root_video_id := COALESCE(parent_root, NEW.parent_video_id);
        NEW.chain_depth := COALESCE(parent_depth, 0) + 1;
    ELSE
        NEW.root_video_id := NULL;
        NEW.chain_depth := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_video_chain_info_trigger
    BEFORE INSERT ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.set_video_chain_info();

CREATE OR REPLACE FUNCTION public.increment_responses_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_video_id IS NOT NULL THEN
        UPDATE public.videos SET responses_count = responses_count + 1
        WHERE id = NEW.parent_video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_responses_count_trigger
    AFTER INSERT ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.increment_responses_count();

CREATE OR REPLACE FUNCTION public.decrement_responses_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_video_id IS NOT NULL THEN
        UPDATE public.videos SET responses_count = GREATEST(0, responses_count - 1)
        WHERE id = OLD.parent_video_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_responses_count_trigger
    AFTER DELETE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.decrement_responses_count();

CREATE OR REPLACE FUNCTION public.update_profile_videos_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET videos_count = videos_count + 1 WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET videos_count = GREATEST(0, videos_count - 1) WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_videos_count_trigger
    AFTER INSERT OR DELETE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_videos_count();

CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS TRIGGER AS $$
DECLARE
    video_owner_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;
        UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
        UPDATE public.profiles SET likes_received_count = likes_received_count + 1 WHERE id = video_owner_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT user_id INTO video_owner_id FROM public.videos WHERE id = OLD.video_id;
        UPDATE public.videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.video_id;
        UPDATE public.profiles SET likes_received_count = GREATEST(0, likes_received_count - 1) WHERE id = video_owner_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.update_like_counts();

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- NOTE: Removed handle_new_user trigger - we create profile explicitly in signup.tsx
-- This avoids race conditions between auto-creation and manual profile creation

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_video_chain(video_id UUID)
RETURNS TABLE (
    id UUID, user_id UUID, parent_video_id UUID, title TEXT,
    thumbnail_url TEXT, chain_depth INTEGER, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE chain AS (
        SELECT v.id, v.user_id, v.parent_video_id, v.title, v.thumbnail_url, v.chain_depth, v.created_at
        FROM public.videos v WHERE v.id = get_video_chain.video_id
        UNION ALL
        SELECT v.id, v.user_id, v.parent_video_id, v.title, v.thumbnail_url, v.chain_depth, v.created_at
        FROM public.videos v INNER JOIN chain c ON v.id = c.parent_video_id
    )
    SELECT * FROM chain ORDER BY chain.chain_depth ASC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_video_responses(
    video_id UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID, user_id UUID, title TEXT, thumbnail_url TEXT,
    likes_count INTEGER, responses_count INTEGER, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.user_id, v.title, v.thumbnail_url, v.likes_count, v.responses_count, v.created_at
    FROM public.videos v
    WHERE v.parent_video_id = get_video_responses.video_id
      AND v.status = 'ready' AND v.visibility = 'public'
    ORDER BY v.created_at DESC LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_response_counts(video_id UUID)
RETURNS TABLE (agree_count BIGINT, disagree_count BIGINT, total_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE agree_disagree = true) AS agree_count,
        COUNT(*) FILTER (WHERE agree_disagree = false) AS disagree_count,
        COUNT(*) AS total_count
    FROM public.videos
    WHERE parent_video_id = get_response_counts.video_id
      AND status = 'ready' AND visibility = 'public';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.feed_videos AS
SELECT
    v.id, v.user_id, v.parent_video_id, v.root_video_id, v.chain_depth, v.agree_disagree,
    v.title, v.description, v.video_url, v.thumbnail_url, v.duration_seconds,
    v.views_count, v.likes_count, v.responses_count, v.created_at, v.published_at,
    p.username, p.display_name, p.avatar_url
FROM public.videos v
INNER JOIN public.profiles p ON v.user_id = p.id
WHERE v.status = 'ready' AND v.visibility = 'public';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Videos policies
CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT USING (visibility = 'public' AND status = 'ready');
CREATE POLICY "Users can view their own videos" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Unlisted videos are viewable with direct link" ON public.videos FOR SELECT USING (visibility = 'unlisted' AND status = 'ready');
CREATE POLICY "Authenticated users can create videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like videos" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow others" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_video_views(video_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.videos SET views_count = views_count + 1
    WHERE id = video_id AND status = 'ready' AND visibility IN ('public', 'unlisted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_video_views(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_user_liked_video(video_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.likes WHERE likes.video_id = has_user_liked_video.video_id AND likes.user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.has_user_liked_video(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_user_following(target_user_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.follows WHERE follows.follower_id = auth.uid() AND follows.following_id = target_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_user_following(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_like(video_id UUID)
RETURNS boolean AS $$
DECLARE
    already_liked boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.likes WHERE likes.video_id = toggle_like.video_id AND likes.user_id = auth.uid()) INTO already_liked;
    IF already_liked THEN
        DELETE FROM public.likes WHERE likes.video_id = toggle_like.video_id AND likes.user_id = auth.uid();
        RETURN false;
    ELSE
        INSERT INTO public.likes (user_id, video_id) VALUES (auth.uid(), toggle_like.video_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_like(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id UUID)
RETURNS boolean AS $$
DECLARE
    already_following boolean;
BEGIN
    IF auth.uid() = target_user_id THEN RAISE EXCEPTION 'Cannot follow yourself'; END IF;
    SELECT EXISTS (SELECT 1 FROM public.follows WHERE follows.follower_id = auth.uid() AND follows.following_id = target_user_id) INTO already_following;
    IF already_following THEN
        DELETE FROM public.follows WHERE follows.follower_id = auth.uid() AND follows.following_id = target_user_id;
        RETURN false;
    ELSE
        INSERT INTO public.follows (follower_id, following_id) VALUES (auth.uid(), target_user_id);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID) TO authenticated;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies - Videos
CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Users can upload their own videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own videos storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own videos storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies - Thumbnails
CREATE POLICY "Thumbnails are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Users can upload their own thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies - Avatars
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Helper functions for storage
CREATE OR REPLACE FUNCTION public.get_video_storage_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$ BEGIN RETURN user_id::text || '/' || filename; END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_thumbnail_storage_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$ BEGIN RETURN user_id::text || '/' || filename; END; $$ LANGUAGE plpgsql IMMUTABLE;

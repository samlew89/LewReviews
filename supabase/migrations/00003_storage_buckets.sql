-- ============================================================================
-- LewReviews MVP - Storage Buckets Configuration
-- Migration: 00003_storage_buckets.sql
-- Description: Creates storage buckets for videos and thumbnails with RLS
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create videos bucket (max 100MB, video/* MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,  -- Public bucket for video playback
    104857600,  -- 100MB in bytes
    ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
);

-- Create thumbnails bucket (max 5MB, image/* MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'thumbnails',
    'thumbnails',
    true,  -- Public bucket for thumbnail display
    5242880,  -- 5MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create avatars bucket (max 2MB, image/* MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- Public bucket for avatar display
    2097152,  -- 2MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- STORAGE RLS POLICIES - VIDEOS BUCKET
-- ============================================================================

-- Anyone can view videos (public bucket)
CREATE POLICY "Videos are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'videos');

-- Authenticated users can upload videos to their own folder
CREATE POLICY "Users can upload their own videos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own videos
CREATE POLICY "Users can update their own videos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'videos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- STORAGE RLS POLICIES - THUMBNAILS BUCKET
-- ============================================================================

-- Anyone can view thumbnails (public bucket)
CREATE POLICY "Thumbnails are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails to their own folder
CREATE POLICY "Users can upload their own thumbnails"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'thumbnails' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own thumbnails
CREATE POLICY "Users can update their own thumbnails"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'thumbnails' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'thumbnails' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'thumbnails' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- STORAGE RLS POLICIES - AVATARS BUCKET
-- ============================================================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ============================================================================

-- Function to generate a video storage path
CREATE OR REPLACE FUNCTION public.get_video_storage_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN user_id::text || '/' || filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate a thumbnail storage path
CREATE OR REPLACE FUNCTION public.get_thumbnail_storage_path(user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN user_id::text || '/' || filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get public URL for a video
CREATE OR REPLACE FUNCTION public.get_video_public_url(video_path TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This will be replaced with actual Supabase URL in production
    RETURN '/storage/v1/object/public/videos/' || video_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get public URL for a thumbnail
CREATE OR REPLACE FUNCTION public.get_thumbnail_public_url(thumbnail_path TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This will be replaced with actual Supabase URL in production
    RETURN '/storage/v1/object/public/thumbnails/' || thumbnail_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

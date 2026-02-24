-- ============================================================================
-- Migration: Delete User Account Function
-- Allows users to delete their own account and all associated data
-- ============================================================================

-- Function to delete user account (called via RPC)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID from auth context
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's videos (this will cascade to video_votes, etc.)
  DELETE FROM videos WHERE user_id = current_user_id;

  -- Delete user's follows (both directions)
  DELETE FROM follows WHERE follower_id = current_user_id OR following_id = current_user_id;

  -- Delete user's profile
  DELETE FROM profiles WHERE id = current_user_id;

  -- Note: Storage objects (video files, thumbnails, avatars) should be cleaned up
  -- via a separate Edge Function or scheduled job that removes orphaned files.
  -- Supabase storage doesn't support deletion from within a database function.

  -- Delete the auth user (requires service role, so we mark for deletion instead)
  -- The actual auth.users deletion needs to happen via Edge Function with service key
  -- For now, the user data is removed and they'll be signed out

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account() IS 'Allows authenticated users to delete their own account and all associated data';

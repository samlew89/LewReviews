-- ============================================================================
-- Security Hardening
-- ============================================================================

-- Remove permissive notifications insert policy.
-- Trigger/service-role writes still work without a client insert policy.
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Do not expose private push metadata through broad profile reads.
REVOKE SELECT (expo_push_token, push_enabled, badge_count)
ON public.profiles
FROM anon, authenticated;

-- Harden SECURITY DEFINER function resolution.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_video_views(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_user_liked_video(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_following(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_like(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_follow(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_user_account() SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_video_notifications() SET search_path = public, pg_temp;

-- Deprecated insecure account deletion RPC in favor of edge-function flow.
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM authenticated;

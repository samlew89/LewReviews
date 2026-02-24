// ============================================================================
// LewReviews Mobile - Analytics (PostHog)
// ============================================================================

import { usePostHog } from 'posthog-react-native';

// Event names - keep consistent for dashboards
export const ANALYTICS_EVENTS = {
  // Auth
  SIGNUP: 'signup',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Videos
  VIDEO_VIEW: 'video_view',
  VIDEO_UPLOAD: 'video_upload',
  VIDEO_UPLOAD_ERROR: 'video_upload_error',

  // Engagement
  AGREE: 'agree',
  DISAGREE: 'disagree',
  REPLY_VIEW: 'reply_view',

  // Social
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
  PROFILE_VIEW: 'profile_view',

  // Navigation
  TAB_VIEW: 'tab_view',
  SEARCH: 'search',
} as const;

// Hook for tracking events
export function useAnalytics() {
  const posthog = usePostHog();

  const track = (event: string, properties?: Record<string, string | number | boolean>) => {
    posthog.capture(event, properties);
  };

  const identify = (userId: string, properties?: Record<string, string | number | boolean>) => {
    posthog.identify(userId, properties);
  };

  const reset = () => {
    posthog.reset();
  };

  return { track, identify, reset };
}

// Type-safe event tracking helpers
export function useTrackVideoView() {
  const { track } = useAnalytics();
  return (videoId: string, authorId: string, isResponse: boolean) => {
    track(ANALYTICS_EVENTS.VIDEO_VIEW, { videoId, authorId, isResponse });
  };
}

export function useTrackVideoUpload() {
  const { track } = useAnalytics();
  return (videoId: string, isResponse: boolean, stance?: boolean) => {
    track(ANALYTICS_EVENTS.VIDEO_UPLOAD, { videoId, isResponse, stance });
  };
}

export function useTrackFollow() {
  const { track } = useAnalytics();
  return (targetUserId: string, isFollow: boolean) => {
    track(isFollow ? ANALYTICS_EVENTS.FOLLOW : ANALYTICS_EVENTS.UNFOLLOW, { targetUserId });
  };
}

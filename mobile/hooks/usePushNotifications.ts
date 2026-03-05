// ============================================================================
// LewReviews Mobile - Push Notifications Hook
// ============================================================================
// Handles push notification registration, permissions, and navigation.
//
// Exports:
//   registerForPushNotifications — requests permission + returns token
//   savePushToken — saves token to Supabase profile
//   usePushNotificationListeners — listeners only (no permission prompt)
//   clearPushToken — clears token on logout
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase, getCurrentUser } from '../lib/supabase';

// ============================================================================
// Notification Handler Configuration
// ============================================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// Types
// ============================================================================

interface NotificationData {
  notification_id?: string;
  type?: 'new_review' | 'response';
  video_id?: string;
}

// ============================================================================
// Exported Helper Functions
// ============================================================================

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', user.id);
}

/**
 * Silently registers push token if permission was already granted.
 * Does NOT prompt the user — safe to call on every app launch.
 */
export async function registerTokenIfPermitted(): Promise<void> {
  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(tokenData.data);
  } catch {
    // Silent failure — token registration is non-critical
  }
}

async function clearBadgeCount(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await Notifications.setBadgeCountAsync(0);

  await supabase
    .from('profiles')
    .update({ badge_count: 0 })
    .eq('id', user.id);
}

// ============================================================================
// Listeners-Only Hook (no permission prompt)
// ============================================================================

export function usePushNotificationListeners(): void {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as NotificationData;
      if (data?.video_id) {
        router.push(`/video/${data.video_id}`);
      }
    },
    [router]
  );

  // Set up notification listeners
  useEffect(() => {
    // Silently register token if permission already granted (returning users)
    registerTokenIfPermitted();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        // Notification received in foreground
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  // Clear badge when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        clearBadgeCount();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    clearBadgeCount();

    return () => {
      subscription.remove();
    };
  }, []);
}

// ============================================================================
// Utility: Clear push token on logout
// ============================================================================

export async function clearPushToken(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', user.id);
}

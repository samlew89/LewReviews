// ============================================================================
// LewReviews Mobile - Push Notifications Hook
// ============================================================================
// Handles push notification registration, permissions, and navigation
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

// Configure how notifications appear when app is in foreground
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
// Helper Functions
// ============================================================================

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch {
    return null;
  }
}

async function savePushToken(token: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', user.id);
}

async function clearBadgeCount(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // Clear iOS badge
  await Notifications.setBadgeCountAsync(0);

  // Clear badge count in database
  await supabase
    .from('profiles')
    .update({ badge_count: 0 })
    .eq('id', user.id);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePushNotifications(): void {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  // Handle notification tap - navigate to video
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as NotificationData;

      if (data?.video_id) {
        router.push(`/video/${data.video_id}`);
      }
    },
    [router]
  );

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        // Notification received in foreground - could show in-app toast
      }
    );

    // Listen for notification taps
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

    // Also clear badge on initial mount
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

export default usePushNotifications;

// ============================================================================
// LewReviews Mobile - Onboarding: Notifications Screen
// ============================================================================

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '../../hooks/useOnboarding';
import { registerForPushNotifications, savePushToken } from '../../hooks/usePushNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboarding();
  const [isEnabling, setIsEnabling] = useState(false);

  async function finish() {
    // Setting global state triggers root layout to navigate to feed
    await completeOnboarding();
  }

  async function handleEnable() {
    setIsEnabling(true);
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    } finally {
      setIsEnabling(false);
      await finish();
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
      {/* Icon */}
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications-outline" size={56} color="#E8C547" />
        </View>
        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.subtitle}>
          Get notified when someone responds to your take
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={handleEnable}
          disabled={isEnabling}
        >
          {isEnabling ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.ctaText}>Enable Notifications</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={finish}
          disabled={isEnabling}
        >
          <Text style={styles.skipText}>Maybe Later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(232, 197, 71, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EDEDED',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    paddingBottom: 8,
  },
  ctaButton: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.2,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
});

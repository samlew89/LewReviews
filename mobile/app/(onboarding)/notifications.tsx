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

const ACCENT = '#FF2D55';
const GOLD = '#E8C547';

// ---------------------------------------------------------------------------
// Page dots
// ---------------------------------------------------------------------------
function PageDots({ active }: { active: number }) {
  return (
    <View style={dotStyles.row}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active ? dotStyles.dotActive : dotStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notification preview card
// ---------------------------------------------------------------------------
interface NotifPreviewProps {
  title: string;
  subtitle: string;
  badgeColor: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
}

function NotifPreview({ title, subtitle, badgeColor, badgeIcon }: NotifPreviewProps) {
  return (
    <View style={styles.notifCard}>
      {/* Avatar placeholder (circle with person icon) */}
      <View style={styles.notifAvatar}>
        <Ionicons name="person" size={18} color="#fff" />
      </View>

      {/* Info */}
      <View style={styles.notifInfo}>
        <Text style={styles.notifTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.notifSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Badge */}
      <View
        style={[
          styles.notifBadge,
          { backgroundColor: badgeColor + '26' },
        ]}
      >
        <Ionicons name={badgeIcon} size={14} color={badgeColor} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
const NOTIF_PREVIEWS: NotifPreviewProps[] = [
  {
    title: '@moviebuff42 disagreed with your take',
    subtitle: 'The Batman \u00b7 2 min ago',
    badgeColor: '#FF3B30',
    badgeIcon: 'close',
  },
  {
    title: '@reelcritic agreed with your take',
    subtitle: 'Dune: Part Two \u00b7 15 min ago',
    badgeColor: '#34C759',
    badgeIcon: 'checkmark',
  },
  {
    title: '@cinephile posted a new review',
    subtitle: 'Oppenheimer \u00b7 1 hr ago',
    badgeColor: GOLD,
    badgeIcon: 'videocam',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboarding();
  const [isEnabling, setIsEnabling] = useState(false);

  async function finish() {
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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{'Never miss\na hot take'}</Text>
        <Text style={styles.subtitle}>
          {'Get notified when someone disagrees\nwith your take \u2014 or drops a new review.'}
        </Text>
      </View>

      {/* Notification previews */}
      <View style={styles.previews}>
        {NOTIF_PREVIEWS.map((notif) => (
          <NotifPreview key={notif.title} {...notif} />
        ))}
      </View>

      {/* Bell icon with glow */}
      <View style={styles.bellSection}>
        <View style={styles.bellGlow} />
        <View style={styles.bellRing} />
        <Ionicons name="notifications" size={36} color={GOLD} />
      </View>

      {/* Bottom */}
      <View style={styles.bottomSection}>
        <PageDots active={2} />
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
          onPress={handleEnable}
          disabled={isEnabling}
        >
          {isEnabling ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Enable Notifications</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={finish}
          disabled={isEnabling}
        >
          <Text style={styles.skipText}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 16,
  },
  // -- Header --
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffffff66',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  // -- Notification cards --
  previews: {
    gap: 12,
    paddingHorizontal: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff0f',
    borderWidth: 1,
    borderColor: '#ffffff14',
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifInfo: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 17,
  },
  notifSub: {
    fontSize: 11,
    color: '#ffffff4d',
  },
  notifBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // -- Bell --
  bellSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    height: 120,
  },
  bellGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e8c54720',
  },
  bellRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#e8c54733',
  },
  // -- Bottom --
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 16,
  },
  ctaButton: {
    backgroundColor: ACCENT,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { x: 0, y: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff4d',
  },
});

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#ffffff33',
  },
});

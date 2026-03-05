// ============================================================================
// LewReviews Mobile - Onboarding: Welcome Screen
// ============================================================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEATURES = [
  {
    icon: 'videocam-outline' as const,
    text: 'Post your take on any movie or show',
  },
  {
    icon: 'chatbubbles-outline' as const,
    text: 'Others respond with agree or disagree',
  },
  {
    icon: 'trophy-outline' as const,
    text: 'Climb the leaderboard with the highest approval score',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
      {/* Logo area */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="film-outline" size={48} color="#E8C547" />
        </View>
        <Text style={styles.title}>Welcome to LewReviews</Text>
        <Text style={styles.subtitle}>Video reviews. Real opinions.</Text>
      </View>

      {/* Feature list */}
      <View style={styles.featureList}>
        {FEATURES.map((feature) => (
          <View key={feature.icon} style={styles.featureRow}>
            <View style={styles.featureIconContainer}>
              <Ionicons name={feature.icon} size={26} color="#E8C547" />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={() => router.replace('/(onboarding)/follow-users')}
        >
          <Text style={styles.ctaText}>Get Started</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    marginTop: 8,
    textAlign: 'center',
  },
  featureList: {
    gap: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#EDEDED',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
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
});

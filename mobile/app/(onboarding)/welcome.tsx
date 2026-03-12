// ============================================================================
// LewReviews Mobile - Onboarding: Welcome Screen
// ============================================================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#FF2D55';

const FEATURES = [
  {
    icon: 'videocam' as const,
    text: 'Post your take on any movie or show',
  },
  {
    icon: 'people' as const,
    text: 'Others respond with agree or disagree',
  },
  {
    icon: 'trophy' as const,
    text: 'Climb the leaderboard with the best ratio',
  },
];

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

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Hero section */}
      <View style={styles.heroSection}>
        {/* Radial glow */}
        <View style={styles.heroGlow} />
        {/* Outer ring */}
        <View style={styles.heroRingOuter} />
        {/* Inner ring */}
        <View style={styles.heroRing} />
        {/* Icon */}
        <View style={styles.heroIconWrap}>
          <Ionicons name="film" size={64} color={ACCENT} />
        </View>
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{'Your takes.\nOut loud.'}</Text>
      <Text style={styles.subtitle}>
        Video reviews. Real debates. No hiding behind text.
      </Text>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.icon} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={feature.icon} size={18} color={ACCENT} />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Bottom */}
      <View style={styles.bottomSection}>
        <PageDots active={0} />
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
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
    paddingHorizontal: 16,
  },
  // -- Hero --
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    marginTop: 100,
  },
  heroGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FF2D5520',
  },
  heroRingOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#FF2D5518',
  },
  heroRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#FF2D5533',
  },
  heroIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // -- Text --
  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff80',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  // -- Features --
  features: {
    gap: 20,
    marginTop: 40,
    paddingHorizontal: 30,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff0a',
    borderWidth: 1,
    borderColor: '#ffffff0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffffcc',
    lineHeight: 20,
  },
  // -- Bottom --
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 24,
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

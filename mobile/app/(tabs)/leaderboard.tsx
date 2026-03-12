// ============================================================================
// LewReviews Mobile - Leaderboard Tab
// ============================================================================
// Redesigned to match design.pen: podium top 3, rank list, your rank card
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLeaderboard, type LeaderboardEntry } from '../../hooks/useLeaderboard';

type TabType = 'all' | 'following';

// Tab bar geometry (must match _layout.tsx)
const PILL_HEIGHT = 52;
const PILL_H_MARGIN_BOTTOM = 4; // min bottomPadding from _layout
const YOUR_RANK_CARD_HEIGHT = 56;
const YOUR_RANK_GAP = 8; // gap between card and tab pill

// Medal config for podium
const MEDALS = ['👑', '🥈', '🥉'] as const;
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;
const PODIUM_SIZES = [68, 56, 50] as const;

function formatRatio(value: number): string {
  if (value > 0) return `+${value}`;
  return value.toString();
}

function getRatioColor(ratio: number): string {
  if (ratio > 0) return '#34C759';
  if (ratio < 0) return '#FF3B30';
  return 'rgba(255,255,255,0.3)';
}

function getTrendIcon(ratio: number): 'trending-up' | 'trending-down' | 'remove' {
  if (ratio > 0) return 'trending-up';
  if (ratio < 0) return 'trending-down';
  return 'remove';
}

// ── Podium Place ──────────────────────────────────────────────
function PodiumPlace({
  entry,
  index,
  onPress,
}: {
  entry: LeaderboardEntry;
  index: number; // 0=1st, 1=2nd, 2=3rd
  onPress: (id: string) => void;
}) {
  const size = PODIUM_SIZES[index];
  const borderColor = MEDAL_COLORS[index];

  return (
    <TouchableOpacity
      style={styles.podiumPlace}
      onPress={() => onPress(entry.id)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.podiumAvatarWrap, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderColor }]}>
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
        ) : (
          <View style={[styles.podiumAvatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Ionicons name="person" size={size * 0.4} color="#fff" />
          </View>
        )}
      </View>

      {/* Medal emoji */}
      <Text style={[styles.podiumMedal, index === 0 && styles.podiumMedalFirst]}>
        {MEDALS[index]}
      </Text>

      {/* Username */}
      <Text style={styles.podiumUsername} numberOfLines={1}>
        @{entry.username}
      </Text>

      {/* Score */}
      <Text style={[styles.podiumScore, { color: MEDAL_COLORS[index] }]}>
        {formatRatio(entry.ratio)}
      </Text>

      {/* Review count */}
      <Text style={styles.podiumReviews}>
        {entry.videos_count} review{entry.videos_count !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ── Rank Row ──────────────────────────────────────────────────
function RankRow({
  entry,
  onPress,
}: {
  entry: LeaderboardEntry;
  onPress: (id: string) => void;
}) {
  const ratioColor = getRatioColor(entry.ratio);
  const trendIcon = getTrendIcon(entry.ratio);

  return (
    <TouchableOpacity
      style={styles.rankRow}
      onPress={() => onPress(entry.id)}
      activeOpacity={0.7}
    >
      {/* Rank number */}
      <Text style={styles.rankNumber}>{entry.rank}</Text>

      {/* Avatar */}
      {entry.avatar_url ? (
        <Image source={{ uri: entry.avatar_url }} style={styles.rankAvatar} contentFit="cover" />
      ) : (
        <View style={styles.rankAvatarPlaceholder}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
      )}

      {/* Info */}
      <View style={styles.rankInfo}>
        <Text style={styles.rankUsername} numberOfLines={1}>@{entry.username}</Text>
        <Text style={styles.rankReviewCount}>
          {entry.videos_count} review{entry.videos_count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Score */}
      <Text style={[styles.rankScore, { color: ratioColor }]}>
        {formatRatio(entry.ratio)}
      </Text>

      {/* Trend icon */}
      <Ionicons name={trendIcon} size={14} color={ratioColor} style={styles.trendIcon} />
    </TouchableOpacity>
  );
}

// ── Your Rank Card ────────────────────────────────────────────
function YourRankCard({
  entry,
  onPress,
}: {
  entry: LeaderboardEntry;
  onPress: (id: string) => void;
}) {
  const ratioColor = getRatioColor(entry.ratio);
  const trendIcon = getTrendIcon(entry.ratio);

  return (
    <TouchableOpacity
      style={styles.yourRankOuter}
      onPress={() => onPress(entry.id)}
      activeOpacity={0.8}
    >
      <BlurView intensity={20} tint="dark" style={styles.yourRankBlur}>
        <View style={styles.yourRankInner}>
          {/* Rank number */}
          <Text style={styles.yourRankNumber}>{entry.rank}</Text>

          {/* Avatar */}
          {entry.avatar_url ? (
            <Image source={{ uri: entry.avatar_url }} style={styles.yourRankAvatar} contentFit="cover" />
          ) : (
            <View style={styles.yourRankAvatarPlaceholder}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
          )}

          {/* Info */}
          <View style={styles.yourRankInfo}>
            <Text style={styles.yourRankYou}>You</Text>
            <Text style={styles.yourRankHandle} numberOfLines={1}>@{entry.username}</Text>
          </View>

          {/* Score */}
          <Text style={[styles.yourRankScore, { color: ratioColor }]}>
            {formatRatio(entry.ratio)}
          </Text>

          {/* Trend icon */}
          <Ionicons name={trendIcon} size={14} color={ratioColor} />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const { data: entries, isLoading } = useLeaderboard(activeTab);

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  // Split top 3 and rest
  const { podiumEntries, listEntries, currentUserEntry } = useMemo(() => {
    if (!entries || entries.length === 0) {
      return { podiumEntries: [], listEntries: [], currentUserEntry: null };
    }
    const podium = entries.slice(0, 3);
    const list = entries.slice(3);
    const current = entries.find((e) => e.isCurrentUser) || null;
    return { podiumEntries: podium, listEntries: list, currentUserEntry: current };
  }, [entries]);

  // Reorder podium: [2nd, 1st, 3rd]
  const orderedPodium = useMemo(() => {
    if (podiumEntries.length < 3) return podiumEntries;
    return [podiumEntries[1], podiumEntries[0], podiumEntries[2]];
  }, [podiumEntries]);

  const renderRankRow = useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <RankRow entry={item} onPress={handleUserPress} />
    ),
    [handleUserPress]
  );

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.id, []);

  // Compute the bottom offset for the Your Rank card so it sits above the floating tab pill
  const tabBarBottomPad = Math.max(Math.round(insets.bottom * 0.35), PILL_H_MARGIN_BOTTOM);
  const yourRankBottom = PILL_HEIGHT + tabBarBottomPad + YOUR_RANK_GAP;
  // Total blocked area at the bottom (card + gap below list)
  const bottomBlockedArea = currentUserEntry
    ? yourRankBottom + YOUR_RANK_CARD_HEIGHT + 8
    : PILL_HEIGHT + tabBarBottomPad + 16;

  const ListHeader = useMemo(
    () => (
      <>
        {/* Podium */}
        {podiumEntries.length >= 3 && (
          <View style={styles.podiumContainer}>
            {/* Gold glow behind 1st place */}
            <LinearGradient
              colors={['rgba(255,215,0,0.2)', 'rgba(255,215,0,0)']}
              style={styles.goldGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.podiumRow}>
              {orderedPodium.map((entry, i) => {
                // Map display order back to rank order: [1,0,2] → rank indices
                const rankIndex = i === 0 ? 1 : i === 1 ? 0 : 2;
                return (
                  <PodiumPlace
                    key={entry.id}
                    entry={entry}
                    index={rankIndex}
                    onPress={handleUserPress}
                  />
                );
              })}
            </View>
          </View>
        )}
      </>
    ),
    [podiumEntries, orderedPodium, handleUserPress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>

      {/* Segment Control */}
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'all' && styles.segmentTabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.segmentText, activeTab === 'all' && styles.segmentTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'following' && styles.segmentTabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.segmentText, activeTab === 'following' && styles.segmentTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : !entries || entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>
            {activeTab === 'following' ? 'Follow some people first' : 'No rankings yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listEntries}
          renderItem={renderRankRow}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomBlockedArea },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Your Rank Card — always anchored above the floating tab bar */}
      {currentUserEntry && (
        <View style={[styles.yourRankPosition, { bottom: yourRankBottom }]}>
          <YourRankCard entry={currentUserEntry} onPress={handleUserPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── Header ──
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Segment Control ──
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segmentTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17,
  },
  segmentTabActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  segmentTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Podium ──
  podiumContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    position: 'relative',
  },
  goldGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    top: 0,
    left: '50%',
    marginLeft: -60,
    opacity: 0.6,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  podiumPlace: {
    alignItems: 'center',
    width: 90,
    gap: 4,
  },
  podiumAvatarWrap: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumMedal: {
    fontSize: 18,
  },
  podiumMedalFirst: {
    fontSize: 22,
  },
  podiumUsername: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  podiumScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  podiumReviews: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
  },

  // ── Rank List ──
  listContent: {
    paddingHorizontal: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    width: 24,
    textAlign: 'center',
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rankAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rankReviewCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  rankScore: {
    fontSize: 15,
    fontWeight: '700',
  },
  trendIcon: {
    marginLeft: 2,
  },

  // ── Your Rank Card ──
  yourRankPosition: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  yourRankOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  yourRankBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  yourRankInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  yourRankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  yourRankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  yourRankAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourRankInfo: {
    flex: 1,
    gap: 1,
  },
  yourRankYou: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  yourRankHandle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  yourRankScore: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Empty / Loading ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
});

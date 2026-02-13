// ============================================================================
// LewReviews Mobile - Leaderboard Tab
// ============================================================================
// Shows top users by ratio with All / Friends column toggle
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLeaderboard, type LeaderboardEntry } from '../../hooks/useLeaderboard';

type TabType = 'all' | 'friends';

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

  const formatRatio = useCallback((value: number): string => {
    if (value > 0) return `+${value}`;
    return value.toString();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleUserPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text style={[
            styles.rankText,
            item.rank === 1 && styles.rankGold,
            item.rank === 2 && styles.rankSilver,
            item.rank === 3 && styles.rankBronze,
          ]}>
            {item.rank}
          </Text>
        </View>

        {/* Avatar */}
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color="#fff" />
          </View>
        )}

        {/* Name */}
        <View style={styles.nameContainer}>
          <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
          {item.display_name && (
            <Text style={styles.displayName} numberOfLines={1}>{item.display_name}</Text>
          )}
        </View>

        {/* Ratio */}
        <View style={styles.ratioContainer}>
          <Text style={[
            styles.ratioValue,
            item.ratio > 0 ? styles.ratioPositive : item.ratio < 0 ? styles.ratioNegative : null,
          ]}>
            {formatRatio(item.ratio)}
          </Text>
          <Text style={styles.ratioLabel}>ratio</Text>
        </View>
      </TouchableOpacity>
    ),
    [handleUserPress, formatRatio]
  );

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>

      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E8C547" />
        </View>
      ) : !entries || entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>
            {activeTab === 'friends' ? 'Follow some people first' : 'No rankings yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EDEDED',
    letterSpacing: -0.4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1E1E1E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#EDEDED',
  },
  listContent: {
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  rankGold: {
    color: '#E8C547',
  },
  rankSilver: {
    color: '#C0C0C0',
  },
  rankBronze: {
    color: '#CD7F32',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EDEDED',
    letterSpacing: -0.2,
  },
  displayName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
    letterSpacing: -0.1,
  },
  ratioContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  ratioValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EDEDED',
  },
  ratioPositive: {
    color: '#34c759',
  },
  ratioNegative: {
    color: '#ff3b30',
  },
  ratioLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
    textTransform: 'uppercase',
  },
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

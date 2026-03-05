// ============================================================================
// LewReviews Mobile - Onboarding: Follow Reviewers Screen
// ============================================================================

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useSuggestedUsers } from '../../hooks/useSuggestedUsers';
import { UserListItem } from '../../components/UserListItem';
import type { UserSearchResult } from '../../types';

export default function FollowUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { users: suggestedUsers, isLoading } = useSuggestedUsers();

  const allUserIds = suggestedUsers.map((u) => u.id);

  const { data: followingSet = new Set<string>() } = useQuery({
    queryKey: ['following-set', user?.id, allUserIds.join(',')],
    queryFn: async () => {
      if (!user?.id || allUserIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', allUserIds);
      if (error) throw error;
      return new Set(data.map((f) => f.following_id));
    },
    enabled: !!user?.id && allUserIds.length > 0,
    staleTime: 1000 * 30,
  });

  const renderUser = useCallback(
    ({ item }: { item: UserSearchResult }) => (
      <UserListItem
        user={item}
        currentUserId={user?.id ?? null}
        initialFollowing={followingSet.has(item.id)}
      />
    ),
    [user?.id, followingSet]
  );

  const keyExtractor = useCallback((item: UserSearchResult) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Follow some reviewers</Text>
        <Text style={styles.subtitle}>So your feed isn't empty</Text>
      </View>

      {/* User list */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#E8C547" />
        </View>
      ) : suggestedUsers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No users to suggest yet</Text>
        </View>
      ) : (
        <FlatList
          data={suggestedUsers}
          renderItem={renderUser}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom actions */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={() => router.replace('/(onboarding)/notifications')}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={() => router.replace('/(onboarding)/notifications')}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#EDEDED',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  },
  listContent: {
    paddingBottom: 16,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingTop: 12,
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

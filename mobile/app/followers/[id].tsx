// ============================================================================
// LewReviews Mobile - Followers List Screen
// ============================================================================
// Shows everyone who follows a given user
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../lib/supabase';
import { useFollowList } from '../../hooks/useFollowList';
import { UserListItem } from '../../components/UserListItem';
import type { FollowListUser } from '../../types';

export default function FollowersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: userId } = useLocalSearchParams<{ id: string }>();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });

  const { users, isLoading, hasMore, loadMore, isLoadingMore, refresh } = useFollowList(
    userId || '',
    'followers'
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const renderUser = useCallback(
    ({ item }: { item: FollowListUser }) => (
      <UserListItem user={item} currentUserId={currentUser?.id ?? null} />
    ),
    [currentUser?.id]
  );

  const keyExtractor = useCallback((item: FollowListUser) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#E8C547" />
      </View>
    );
  }, [isLoadingMore]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.headerButton} />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasMore && loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          onRefresh={refresh}
          refreshing={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EDEDED',
  },
  listContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

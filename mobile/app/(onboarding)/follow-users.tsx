// ============================================================================
// LewReviews Mobile - Onboarding: Follow Reviewers Screen
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useSuggestedUsers } from '../../hooks/useSuggestedUsers';
import { useFollow } from '../../hooks/useFollow';
import type { UserSearchResult } from '../../types';

const ACCENT = '#FF2D55';

// ---------------------------------------------------------------------------
// Page dots (shared pattern)
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
// User row matching design: avatar · @handle + stats · Follow/Following pill
// ---------------------------------------------------------------------------
function UserRow({
  user,
  currentUserId,
  initialFollowing,
}: {
  user: UserSearchResult;
  currentUserId: string | null;
  initialFollowing: boolean;
}) {
  const { isFollowing: fetchedFollowing, isToggling, toggleFollow, isLoading } =
    useFollow(user.id);
  const isFollowing =
    isLoading && initialFollowing !== undefined
      ? initialFollowing
      : fetchedFollowing;
  const isOwnProfile = currentUserId === user.id;

  return (
    <View style={styles.userRow as ViewStyle}>
      {/* Avatar */}
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={styles.avatar as ImageStyle}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatarPlaceholder as ViewStyle}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
      )}

      {/* Info */}
      <View style={styles.userInfo}>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username}
        </Text>
        <Text style={styles.userStats} numberOfLines={1}>
          {user.followers_count} follower{user.followers_count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Follow button */}
      {!isOwnProfile && (
        <Pressable
          style={[
            styles.followBtn,
            isFollowing ? styles.followingBtn : styles.followBtnActive,
          ]}
          onPress={() => toggleFollow()}
          disabled={isToggling || isLoading}
        >
          {isToggling || isLoading ? (
            <ActivityIndicator
              size="small"
              color={isFollowing ? '#ffffff66' : '#fff'}
            />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                isFollowing && styles.followingBtnText,
              ]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
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
      <UserRow
        user={item}
        currentUserId={user?.id ?? null}
        initialFollowing={followingSet.has(item.id)}
      />
    ),
    [user?.id, followingSet],
  );

  const keyExtractor = useCallback((item: UserSearchResult) => item.id, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find your people</Text>
        <Text style={styles.subtitle}>
          {'Follow reviewers you vibe with.\nYou can always change this later.'}
        </Text>
      </View>

      {/* User list */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={ACCENT} />
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
        <PageDots active={1} />
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
          onPress={() => router.replace('/(onboarding)/notifications')}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
        <Pressable
          style={styles.skipButton}
          onPress={() => router.replace('/(onboarding)/notifications')}
        >
          <Text style={styles.skipText}>Skip for now</Text>
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
  },
  // -- Header --
  header: {
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
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
  // -- List --
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#ffffff66',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  // -- User row --
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 68,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff0a',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userStats: {
    fontSize: 13,
    color: '#ffffff4d',
  },
  followBtn: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 86,
  },
  followBtnActive: {
    backgroundColor: ACCENT,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ffffff33',
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: '#ffffff66',
  },
  // -- Bottom --
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
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

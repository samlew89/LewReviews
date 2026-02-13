// ============================================================================
// LewReviews Mobile - User List Item
// ============================================================================
// Reusable row component: avatar, username, display name, follow button.
// Used in search results, suggested users, followers/following lists.
// ============================================================================

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFollow } from '../hooks/useFollow';

interface UserListItemProps {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  showFollowButton?: boolean;
  currentUserId?: string | null;
}

export function UserListItem({ user, showFollowButton = true, currentUserId }: UserListItemProps) {
  const router = useRouter();
  const { isFollowing, isToggling, toggleFollow, isLoading } = useFollow(user.id);

  const isOwnProfile = currentUserId === user.id;

  const handlePress = useCallback(() => {
    router.push(`/profile/${user.id}`);
  }, [router, user.id]);

  const handleFollowPress = useCallback(async () => {
    await toggleFollow();
  }, [toggleFollow]);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {/* Avatar */}
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
      )}

      {/* Name info */}
      <View style={styles.nameContainer}>
        <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
        {user.display_name && (
          <Text style={styles.displayName} numberOfLines={1}>{user.display_name}</Text>
        )}
      </View>

      {/* Follow button (hidden for own profile) */}
      {showFollowButton && !isOwnProfile && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollowPress}
          disabled={isToggling || isLoading}
          activeOpacity={0.8}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={isFollowing ? '#999' : '#000'} />
          ) : (
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0C0C0C',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  followButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 4,
    backgroundColor: '#E8C547',
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  followingButtonText: {
    color: '#999',
  },
});

// ============================================================================
// LewReviews Mobile - Public Profile Screen
// ============================================================================
// Displays any user's profile with their videos, stats, and follow button
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, getCurrentUser, getCurrentSession } from '../../lib/supabase';
import { STORAGE_BUCKETS, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants/config';
import { useFollow } from '../../hooks/useFollow';
import type { Profile, Video } from '../../types';

type TabType = 'reviews' | 'replies';

interface ReplyVideo {
  id: string;
  thumbnail_url: string | null;
  views_count: number;
  parent_video_id: string;
  agree_disagree: boolean;
  created_at: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 6) / 3;

// ============================================================================
// Component
// ============================================================================

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('reviews');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Handle avatar tap (own profile only) - pick and upload directly
  const handleAvatarPress = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setIsUploadingAvatar(true);

      const user = await getCurrentUser();
      if (!user) return;

      const session = await getCurrentSession();
      if (!session) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const avatarFileName = `${user.id}/${timestamp}_${random}.jpg`;

      // Use FileSystem.uploadAsync to avoid RN fetch→blob 0-byte bug
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.AVATARS}/${avatarFileName}`;
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, result.assets[0].uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'image/jpeg',
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        Alert.alert('Error', 'Failed to upload avatar');
        return;
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(avatarFileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('Error', 'Failed to update profile');
        return;
      }

      // Update avatar in cached feed data without refetching (avoids spinner/scroll reset)
      queryClient.setQueriesData({ queryKey: ['feed'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            videos: page.videos.map((v: any) =>
              v.user_id === user.id ? { ...v, avatar_url: urlData.publicUrl } : v
            ),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch {
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [userId, queryClient]);

  // Check if this is the current user's profile
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isOwnProfile = currentUser?.id === userId;

  // Fetch profile data
  const {
    data: profile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  // Fetch user's reviews (root videos only)
  const {
    data: reviews,
    isLoading: isLoadingReviews,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ready')
        .is('parent_video_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Video[];
    },
    enabled: !!userId,
  });

  // Fetch user's replies (video responses)
  const { data: replies } = useQuery({
    queryKey: ['user-replies', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          thumbnail_url,
          views_count,
          parent_video_id,
          agree_disagree,
          created_at
        `)
        .eq('user_id', userId)
        .not('parent_video_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReplyVideo[];
    },
    enabled: !!userId,
  });

  // Follow hook
  const {
    isFollowing,
    followersCount,
    isToggling,
    toggleFollow,
  } = useFollow(userId || '');

  // Calculate ratio from profile
  const ratio = useMemo(() => {
    if (!profile) return 0;
    return (profile.agrees_received_count || 0) - (profile.disagrees_received_count || 0);
  }, [profile]);

  // Get current tab videos
  const currentVideos = useMemo(() => {
    return activeTab === 'reviews' ? (reviews || []) : (replies || []);
  }, [activeTab, reviews, replies]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchProfile(), refetchReviews()]);
  }, [refetchProfile, refetchReviews]);

  // Format number for display
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  // Format ratio with sign
  const formatRatio = useCallback((value: number): string => {
    if (value > 0) return `+${formatCount(value)}`;
    if (value < 0) return formatCount(value);
    return '0';
  }, [formatCount]);

  // Handle video press
  const handleVideoPress = useCallback(
    (videoId: string) => {
      router.push(`/video/${videoId}`);
    },
    [router]
  );

  // Handle back press
  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  // Handle follow/unfollow
  const handleFollowPress = useCallback(async () => {
    if (!currentUser) {
      router.push('/(auth)/login');
      return;
    }
    await toggleFollow();
  }, [currentUser, toggleFollow, router]);

  // Handle edit profile (for own profile)
  const handleEditProfile = useCallback(() => {
    router.push('/(modals)/edit-profile');
  }, [router]);

  const isLoading = isLoadingProfile || isLoadingReviews;

  if (isLoading && !profile) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Ionicons name="person-circle-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  // Use follow hook's count which has optimistic updates
  const displayFollowersCount = isOwnProfile
    ? profile.followers_count
    : followersCount;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor="#fff"
        />
      }
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.headerButton} />
      </View>

      {/* Profile info */}
      <View style={styles.profileInfo}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={isOwnProfile ? handleAvatarPress : undefined}
          activeOpacity={isOwnProfile ? 0.8 : 1}
          disabled={!isOwnProfile || isUploadingAvatar}
        >
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          )}
          {isOwnProfile && isUploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
          {isOwnProfile && !isUploadingAvatar && (
            <View style={styles.avatarAddBadge}>
              <Ionicons name={profile.avatar_url ? 'pencil' : 'add'} size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.displayName}>
          @{profile.username}
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/following/${userId}`)}>
            <Text style={styles.statNumber}>{formatCount(profile.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/${userId}`)}>
            <Text style={styles.statNumber}>{formatCount(displayFollowersCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              ratio > 0 ? styles.positiveRatio : ratio < 0 ? styles.negativeRatio : null
            ]}>
              {formatRatio(ratio)}
            </Text>
            <Text style={styles.statLabel}>Ratio</Text>
          </View>
        </View>

        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {/* Action Button */}
        {isOwnProfile ? (
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
            ]}
            onPress={handleFollowPress}
            disabled={isToggling}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Videos Grid */}
      <View style={styles.videosSection}>
        <View style={styles.videosTabs}>
          <TouchableOpacity
            style={[styles.videosTab, activeTab === 'reviews' && styles.videosTabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={activeTab === 'reviews' ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.videosTab, activeTab === 'replies' && styles.videosTabActive]}
            onPress={() => setActiveTab('replies')}
          >
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={activeTab === 'replies' ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
            />
          </TouchableOpacity>
        </View>

        {currentVideos.length === 0 ? (
          <View style={styles.emptyVideos}>
            <Ionicons
              name={activeTab === 'reviews' ? 'videocam-outline' : 'chatbubble-outline'}
              size={48}
              color="rgba(255, 255, 255, 0.3)"
            />
            <Text style={styles.emptyText}>
              {activeTab === 'reviews' ? 'No reviews yet' : 'No replies yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.videosGrid}>
            {currentVideos.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoThumbnail}
                onPress={() => handleVideoPress(video.id)}
                activeOpacity={0.8}
              >
                {video.thumbnail_url ? (
                  <Image
                    source={{ uri: video.thumbnail_url }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="play" size={24} color="#fff" />
                  </View>
                )}
                {activeTab === 'replies' && (
                  <View style={[
                    styles.stanceBadge,
                    (video as ReplyVideo).agree_disagree ? styles.agreeBadge : styles.disagreeBadge
                  ]}>
                    <Ionicons
                      name={(video as ReplyVideo).agree_disagree ? 'checkmark' : 'close'}
                      size={10}
                      color="#fff"
                    />
                  </View>
                )}
                <View style={styles.videoStats}>
                  <Ionicons name="play" size={12} color="#fff" />
                  <Text style={styles.videoViewCount}>
                    {formatCount(video.views_count || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  positiveRatio: {
    color: '#34c759',
  },
  negativeRatio: {
    color: '#ff3b30',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButton: {
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followButton: {
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#ff2d55',
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#fff',
  },
  videosSection: {
    flex: 1,
  },
  videosTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  videosTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  videosTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  emptyVideos: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.3,
    margin: 1,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoStats: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoViewCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  stanceBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreeBadge: {
    backgroundColor: '#34c759',
  },
  disagreeBadge: {
    backgroundColor: '#ff3b30',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 16,
  },
});

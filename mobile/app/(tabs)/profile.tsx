// ============================================================================
// LewReviews Mobile - Profile Tab
// User profile screen with video grid and agreed/disagreed sections
// ============================================================================

import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, getCurrentUser, getCurrentSession } from '../../lib/supabase';
import { STORAGE_BUCKETS, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants/config';
import type { Profile, Video } from '../../types';
import { RATING_EMOJIS, RATING_LABELS, type VideoRating } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'reviews' | 'replies';

interface ReplyVideo extends Video {
  parent_video_id: string;
  agree_disagree: boolean;
  parent_video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    views_count: number;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Video[]>([]);
  const [replies, setReplies] = useState<ReplyVideo[]>([]);
  const [ratio, setRatio] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('reviews');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const hasLoadedRef = useRef(false);
  const lastFetchedAt = useRef(0);

  // Handle avatar tap - pick and upload directly
  const handleAvatarPress = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Photo Access Required',
          'Please allow photo library access in Settings to change your profile picture.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
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

      // Update local state immediately
      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);

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
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [queryClient]);

  // Fetch user profile and videos every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      setActiveTab('reviews');

      const fetchProfile = async () => {
        // Skip refetch if data was loaded recently (avoids 3 queries on quick tab switch)
        if (hasLoadedRef.current && Date.now() - lastFetchedAt.current < 30_000) {
          return;
        }

        // Only show spinner on initial load, not on refocus
        if (!hasLoadedRef.current) {
          setIsLoading(true);
        }

        lastFetchedAt.current = Date.now();
        try {
          const user = await getCurrentUser();

          if (!user) {
            setIsLoggedIn(false);
            setIsLoading(false);
            hasLoadedRef.current = false;
            return;
          }

          setIsLoggedIn(true);

          // Fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, bio, website, followers_count, following_count, videos_count, likes_received_count, agrees_received_count, disagrees_received_count, created_at, updated_at')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          setProfile(profileData);

          // Fetch user's root videos (reviews)
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('feed_videos')
            .select('*')
            .eq('user_id', user.id)
            .is('parent_video_id', null)
            .order('created_at', { ascending: false });

          if (reviewsError) throw reviewsError;
          setReviews(reviewsData || []);

          // Calculate ratio from profile's received vote counts
          const receivedAgrees = profileData?.agrees_received_count || 0;
          const receivedDisagrees = profileData?.disagrees_received_count || 0;
          setRatio(receivedAgrees - receivedDisagrees);

          // Fetch user's reply videos (responses to other videos)
          const { data: repliesData, error: repliesError } = await supabase
            .from('videos')
            .select(`
              id,
              thumbnail_url,
              views_count,
              parent_video_id,
              agree_disagree,
              created_at
            `)
            .eq('user_id', user.id)
            .not('parent_video_id', 'is', null)
            .order('created_at', { ascending: false });

          if (!repliesError && repliesData) {
            setReplies(repliesData as ReplyVideo[]);
          }

          hasLoadedRef.current = true;
        } catch {
          // Error fetching profile - silently fail
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }, [])
  );

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

  // Handle login press
  const handleLoginPress = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  // Handle settings press
  const handleSettingsPress = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // Handle edit profile press
  const handleEditProfile = useCallback(() => {
    router.push('/(modals)/edit-profile');
  }, [router]);

  // Handle share press
  const handleSharePress = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out @${profile?.username} on LewReviews!`,
      });
    } catch {
      // Share cancelled or failed
    }
  }, [profile?.username]);

  // Get current tab videos
  const getCurrentVideos = useCallback(() => {
    if (activeTab === 'reviews') return reviews;
    return replies;
  }, [activeTab, reviews, replies]);

  // Get rating badge color
  const getRatingColor = useCallback((rating: VideoRating): string => {
    if (rating >= 4) return 'rgba(232, 197, 71, 0.9)'; // gold
    if (rating === 3) return 'rgba(52, 199, 89, 0.9)'; // green
    return 'rgba(255, 255, 255, 0.2)'; // muted
  }, []);

  // Render video thumbnail
  const renderVideoThumbnail = useCallback(
    (video: Video | ReplyVideo, index: number) => {
      const thumbnailUrl = video.thumbnail_url;
      const videoId = video.id;
      const isReply = activeTab === 'replies';
      const replyVideo = video as ReplyVideo;

      return (
        <TouchableOpacity
          key={video.id}
          style={styles.videoThumbnail}
          onPress={() => handleVideoPress(videoId)}
          activeOpacity={0.8}
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="play" size={24} color="#fff" />
            </View>
          )}
          {/* Rating badge (top-left) */}
          {!isReply && video.rating && (
            <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(video.rating as VideoRating) }]}>
              <Text style={styles.ratingBadgeText}>
                {RATING_EMOJIS[video.rating as VideoRating]} {RATING_LABELS[video.rating as VideoRating]}
              </Text>
            </View>
          )}
          {/* Stance badge for replies */}
          {isReply && (
            <View style={[
              styles.stanceBadge,
              replyVideo.agree_disagree ? styles.agreeBadge : styles.disagreeBadge
            ]}>
              <Ionicons
                name={replyVideo.agree_disagree ? 'checkmark' : 'close'}
                size={10}
                color="#fff"
              />
            </View>
          )}
          {/* Bottom gradient scrim + movie title */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.thumbnailScrim}
          >
            {!isReply && video.movie_title && (
              <Text style={styles.movieTitle} numberOfLines={1}>{video.movie_title}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [activeTab, handleVideoPress, getRatingColor]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
        <Text style={styles.notLoggedInText}>Sign in to see your profile</Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentVideos = getCurrentVideos();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header — Profile title + settings gear */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleSettingsPress}>
          <Ionicons name="settings-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
        </TouchableOpacity>
      </View>

      {/* Profile info */}
      <View style={styles.profileInfo}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          disabled={isUploadingAvatar}
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={36} color="#fff" />
            </View>
          )}
          {isUploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Identity cluster */}
        <Text style={styles.displayName}>{profile?.display_name || profile?.username}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {/* Stats row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(reviews.length)}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <TouchableOpacity style={styles.statItem} onPress={() => profile && router.push(`/following/${profile.id}`)}>
            <Text style={styles.statNumber}>{formatCount(profile?.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => profile && router.push(`/followers/${profile.id}`)}>
            <Text style={styles.statNumber}>{formatCount(profile?.followers_count || 0)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
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

        {/* Action Row — Edit Profile + Share */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} activeOpacity={0.7}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleSharePress} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'reviews' && styles.segmentTabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.segmentTabText, activeTab === 'reviews' && styles.segmentTabTextActive]}>
              Reviews
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'replies' && styles.segmentTabActive]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.segmentTabText, activeTab === 'replies' && styles.segmentTabTextActive]}>
              Replies
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Videos Section */}
      <View style={styles.videosSection}>
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
            <Text style={styles.emptySubtext}>
              {activeTab === 'reviews'
                ? 'Share your first review!'
                : 'Your video replies will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.videosGrid}>
            {currentVideos.map((video, index) => renderVideoThumbnail(video, index))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const GRID_GAP = 8;
const GRID_PADDING = 16;
const COLUMN_COUNT = 3;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
const CARD_HEIGHT_TALL = 200;
const CARD_HEIGHT_SHORT = 130;

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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  avatarContainer: {
    width: 80,
    height: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: -8,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  // Stats row
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  positiveRatio: {
    color: '#34c759',
  },
  negativeRatio: {
    color: '#ff3b30',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  // Action row
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  editButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Segmented control tabs
  segmentedControl: {
    flexDirection: 'row',
    width: '100%',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  segmentTabTextActive: {
    fontWeight: '600',
    color: '#fff',
  },
  // Videos section
  videosSection: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    marginTop: 14,
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
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  videoThumbnail: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT_TALL,
    borderRadius: 12,
    overflow: 'hidden',
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
  thumbnailScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '700',
  },
  stanceBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
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
  // Logged out state
  notLoggedInText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#ff2d55',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

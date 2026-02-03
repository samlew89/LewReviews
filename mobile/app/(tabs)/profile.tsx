// ============================================================================
// LewReviews Mobile - Profile Tab
// User profile screen with video grid and agreed/disagreed sections
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getCurrentUser } from '../../lib/supabase';
import type { Profile, Video } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 4) / 3;

type TabType = 'videos' | 'agreed' | 'disagreed';

interface VideoWithParent extends Video {
  parent_video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [agreedVideos, setAgreedVideos] = useState<VideoWithParent[]>([]);
  const [disagreedVideos, setDisagreedVideos] = useState<VideoWithParent[]>([]);
  const [ratio, setRatio] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('videos');

  // Fetch user profile and videos every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          const user = await getCurrentUser();

          if (!user) {
            setIsLoggedIn(false);
            setIsLoading(false);
            return;
          }

          setIsLoggedIn(true);

          // Fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          setProfile(profileData);

          // Fetch user's videos with agree/disagree counts
          const { data: videosData, error: videosError } = await supabase
            .from('feed_videos')
            .select('*')
            .eq('user_id', user.id)
            .is('parent_video_id', null) // Only root videos (their own reviews)
            .order('created_at', { ascending: false });

          if (videosError) throw videosError;
          setVideos(videosData || []);

          // Calculate ratio from profile's received vote counts
          const receivedAgrees = profileData?.agrees_received_count || 0;
          const receivedDisagrees = profileData?.disagrees_received_count || 0;
          setRatio(receivedAgrees - receivedDisagrees);

          // Fetch videos user voted agree on
          const { data: agreedVotes, error: agreedError } = await supabase
            .from('video_votes')
            .select(`
              video_id,
              video:video_id (
                id,
                title,
                thumbnail_url,
                views_count
              )
            `)
            .eq('user_id', user.id)
            .eq('vote', true)
            .order('created_at', { ascending: false });

          if (!agreedError && agreedVotes) {
            const agreedVideosList = agreedVotes
              .filter(v => v.video)
              .map(v => ({ ...v.video, id: v.video_id })) as Video[];
            setAgreedVideos(agreedVideosList as VideoWithParent[]);
          }

          // Fetch videos user voted disagree on
          const { data: disagreedVotes, error: disagreedError } = await supabase
            .from('video_votes')
            .select(`
              video_id,
              video:video_id (
                id,
                title,
                thumbnail_url,
                views_count
              )
            `)
            .eq('user_id', user.id)
            .eq('vote', false)
            .order('created_at', { ascending: false });

          if (!disagreedError && disagreedVotes) {
            const disagreedVideosList = disagreedVotes
              .filter(v => v.video)
              .map(v => ({ ...v.video, id: v.video_id })) as Video[];
            setDisagreedVideos(disagreedVideosList as VideoWithParent[]);
          }
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
    // TODO: Navigate to settings
  }, []);

  // Handle edit profile press
  const handleEditProfile = useCallback(() => {
    router.push('/(modals)/edit-profile');
  }, [router]);

  // Get current tab videos
  const getCurrentVideos = useCallback(() => {
    switch (activeTab) {
      case 'agreed':
        return agreedVideos;
      case 'disagreed':
        return disagreedVideos;
      default:
        return videos;
    }
  }, [activeTab, videos, agreedVideos, disagreedVideos]);

  // Render video thumbnail
  const renderVideoThumbnail = useCallback(
    (video: Video | VideoWithParent, index: number) => {
      const thumbnailUrl = video.thumbnail_url;
      const videoId = video.id;

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
          {activeTab !== 'videos' && (
            <View style={[
              styles.stanceBadge,
              activeTab === 'agreed' ? styles.agreeBadge : styles.disagreeBadge
            ]}>
              <Ionicons
                name={activeTab === 'agreed' ? 'thumbs-up' : 'thumbs-down'}
                size={10}
                color="#fff"
              />
            </View>
          )}
          <View style={styles.videoStats}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text style={styles.videoViewCount}>
              {formatCount(video.views_count)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [activeTab, handleVideoPress, formatCount]
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
      {/* Header with settings */}
      <View style={styles.header}>
        <Text style={styles.headerUsername}>@{profile?.username}</Text>
        <TouchableOpacity onPress={handleSettingsPress}>
          <Ionicons name="menu-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile info */}
      <View style={styles.profileInfo}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
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
        </View>

        <Text style={styles.displayName}>
          {profile?.display_name || profile?.username}
        </Text>

        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(profile?.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(profile?.followers_count || 0)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
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

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Videos Section */}
      <View style={styles.videosSection}>
        <View style={styles.videosTabs}>
          <TouchableOpacity
            style={[styles.videosTab, activeTab === 'videos' && styles.videosTabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={activeTab === 'videos' ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.videosTab, activeTab === 'agreed' && styles.videosTabActive]}
            onPress={() => setActiveTab('agreed')}
          >
            <Ionicons
              name="thumbs-up"
              size={22}
              color={activeTab === 'agreed' ? '#34c759' : 'rgba(255, 255, 255, 0.5)'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.videosTab, activeTab === 'disagreed' && styles.videosTabActive]}
            onPress={() => setActiveTab('disagreed')}
          >
            <Ionicons
              name="thumbs-down"
              size={22}
              color={activeTab === 'disagreed' ? '#ff3b30' : 'rgba(255, 255, 255, 0.5)'}
            />
          </TouchableOpacity>
        </View>

        {currentVideos.length === 0 ? (
          <View style={styles.emptyVideos}>
            <Ionicons
              name={
                activeTab === 'videos'
                  ? 'videocam-outline'
                  : activeTab === 'agreed'
                  ? 'thumbs-up-outline'
                  : 'thumbs-down-outline'
              }
              size={48}
              color="rgba(255, 255, 255, 0.3)"
            />
            <Text style={styles.emptyText}>
              {activeTab === 'videos'
                ? 'No videos yet'
                : activeTab === 'agreed'
                ? 'No agreed videos'
                : 'No disagreed videos'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'videos'
                ? 'Share your first review!'
                : activeTab === 'agreed'
                ? "Videos you've agreed with will appear here"
                : "Videos you've disagreed with will appear here"}
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
  headerUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
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

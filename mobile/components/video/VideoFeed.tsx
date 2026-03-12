import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,

  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import VideoPlayer, { toggleGlobalMute, getGlobalMuted } from './VideoPlayer';
import VideoCard from './VideoCard';
import RepliesDrawer from './RepliesDrawer';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useConsensusActivity } from '../../hooks/useConsensusActivity';
import type { FeedVideo } from '../../types';

const { width: STATIC_WIDTH, height: STATIC_HEIGHT } = Dimensions.get('window');

interface VideoFeedProps {
  videos: FeedVideo[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
}

interface VideoItemProps {
  video: FeedVideo;
  isActive: boolean;
  itemWidth: number;
  itemHeight: number;
  currentUserId?: string;
  isFollowingAuthor?: boolean;
  onResponsePress: (videoId: string, agree?: boolean) => void;
  onProfilePress: (userId: string) => void;
  onRepliesPress: (videoId: string) => void;
  onDeleteVideo: (videoId: string) => void;
  onReportVideo: (videoId: string) => void;
  onBlockUser: (userId: string, username: string) => void;
  onFollowPress: (userId: string) => void;
  onBookmarkPress: (videoId: string) => void;
  isBookmarked: boolean;
  topInset: number;
  userStance?: boolean | null;
}

function VideoItem({
  video,
  isActive,
  itemWidth,
  itemHeight,
  currentUserId,
  isFollowingAuthor,
  onResponsePress,
  onProfilePress,
  onRepliesPress,
  onDeleteVideo,
  onReportVideo,
  onBlockUser,
  onFollowPress,
  onBookmarkPress,
  isBookmarked,
  topInset,
  userStance,
}: VideoItemProps) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => getGlobalMuted());
  const toggleFnRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (isActive) {
      setIsMuted(getGlobalMuted());
    }
  }, [isActive]);

  useFocusEffect(
    React.useCallback(() => {
      setIsMuted(getGlobalMuted());
    }, [])
  );

  const handleRegisterToggle = useCallback((toggle: () => void) => {
    toggleFnRef.current = toggle;
  }, []);

  const handleTap = useCallback(() => {
    toggleFnRef.current?.();
  }, []);

  const handleMuteToggle = useCallback(() => {
    const newMuted = toggleGlobalMute();
    setIsMuted(newMuted);
  }, []);

  return (
    <View style={[styles.videoItem, { width: itemWidth, height: itemHeight }]}>
      <VideoPlayer
        videoUrl={video.video_url}
        isActive={isActive}
        isShareSheetOpen={isShareSheetOpen}
        onRegisterToggle={handleRegisterToggle}
      />
      <VideoCard
        video={video}
        currentUserId={currentUserId}
        isFollowingAuthor={isFollowingAuthor}
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onRepliesPress={onRepliesPress}
        onShareSheetChange={setIsShareSheetOpen}
        onDeleteVideo={onDeleteVideo}
        onReportVideo={onReportVideo}
        onBlockUser={onBlockUser}
        onFollowPress={onFollowPress}
        onBookmarkPress={onBookmarkPress}
        isBookmarked={isBookmarked}
        topInset={topInset}
        userStance={userStance}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onTap={handleTap}
      />
    </View>
  );
}


export default function VideoFeed({
  videos,
  isLoading,
  isRefreshing,
  hasMore,
  onRefresh,
  onLoadMore,
}: VideoFeedProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const activeIndexRef = useRef(0);
  const isFocusedRef = useRef(true);
  const hasScrolledToTop = useRef(false);
  const isPullToRefresh = useRef(false);
  const hasInitialFocused = useRef(false);
  const savedVideoIdRef = useRef<string | null>(null);
  const filteredVideosRef = useRef<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [repliesVideoId, setRepliesVideoId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const [blockedUsersSet, setBlockedUsersSet] = useState<Set<string>>(new Set());
  const { bookmarkedIds, toggleBookmark } = useBookmarks(videos.map((v) => v.id));
  const { startOrUpdate: updateActivity, end: endActivity } = useConsensusActivity();

  const { data: followingSet = new Set<string>() } = useQuery({
    queryKey: ['following-set', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id);
      if (error) throw error;
      return new Set(data.map((f: { following_id: string }) => f.following_id));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const { data: userStances = new Map<string, boolean>() } = useQuery({
    queryKey: ['user-stances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('parent_video_id, root_video_id, agree_disagree')
        .eq('user_id', user!.id)
        .not('parent_video_id', 'is', null);
      if (error) throw error;
      const stances = new Map<string, boolean>();
      for (const row of data) {
        const targetId = row.root_video_id || row.parent_video_id;
        if (targetId && row.agree_disagree !== null) {
          stances.set(targetId, row.agree_disagree);
        }
      }
      return stances;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!user?.id) {
      setBlockedUsersSet(new Set());
      return;
    }

    const fetchBlocked = async () => {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setBlockedUsersSet(new Set(data.map((b) => b.blocked_user_id)));
      }
    };

    fetchBlocked();
  }, [user?.id]);

  useEffect(() => {
    if (videos.length > 0 && !hasScrolledToTop.current) {
      hasScrolledToTop.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    }
  }, [videos.length]);

  useEffect(() => {
    if (!isRefreshing && isPullToRefresh.current) {
      isPullToRefresh.current = false;
      hasScrolledToTop.current = false;
    }
  }, [isRefreshing]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      setIsFocused(true);

      if (savedVideoIdRef.current && filteredVideosRef.current.length > 0) {
        const savedIndex = filteredVideosRef.current.findIndex(
          (v) => v.id === savedVideoIdRef.current
        );
        if (savedIndex >= 0) {
          activeIndexRef.current = savedIndex;
          setActiveIndex(savedIndex);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: savedIndex, animated: false });
          }, 50);
        }
        savedVideoIdRef.current = null;
      }

      if (!hasInitialFocused.current) {
        hasInitialFocused.current = true;
      }

      return () => {
        isFocusedRef.current = false;
        setIsFocused(false);
        if (filteredVideosRef.current.length > 0 && activeIndexRef.current < filteredVideosRef.current.length) {
          savedVideoIdRef.current = filteredVideosRef.current[activeIndexRef.current]?.id ?? null;
        }
        endActivity();
      };
    }, [endActivity])
  );

  const screenHeightRef = useRef(SCREEN_HEIGHT);
  screenHeightRef.current = SCREEN_HEIGHT;

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / screenHeightRef.current);
      if (index !== activeIndexRef.current) {
        activeIndexRef.current = index;
        setActiveIndex(index);
      }
    },
    []
  );

  const handleResponsePress = useCallback(
    (videoId: string, agree?: boolean) => {
      const params: Record<string, string> = { parentVideoId: videoId };
      if (agree !== undefined) {
        params.agreeDisagree = agree.toString();
      }
      router.push({
        pathname: '/(modals)/response-upload',
        params,
      });
    },
    [router]
  );

  const handleProfilePress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  const handleDeleteVideo = useCallback(
    async (videoId: string) => {
      try {
        const video = videos.find((v) => v.id === videoId);
        if (!video) return;

        if (video.video_url) {
          const videoPath = video.video_url.split('/videos/')[1];
          if (videoPath) {
            await supabase.storage.from('videos').remove([videoPath]);
          }
        }

        if (video.thumbnail_url) {
          const thumbPath = video.thumbnail_url.split('/thumbnails/')[1];
          if (thumbPath) {
            await supabase.storage.from('thumbnails').remove([thumbPath]);
          }
        }

        const { error } = await supabase.from('videos').delete().eq('id', videoId);
        if (error) throw error;

        onRefresh();

        if (video.parent_video_id) {
          queryClient.refetchQueries({ queryKey: ['feed', undefined, undefined] });
        }

        Alert.alert('Deleted', 'Your video has been deleted.');
      } catch (err) {
        Alert.alert('Error', 'Failed to delete video. Please try again.');
      }
    },
    [videos, onRefresh, queryClient]
  );

  const handleReportVideo = useCallback(
    async (videoId: string) => {
      if (!user?.id) return;

      const video = videos.find((v) => v.id === videoId);
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_video_id: videoId,
        reported_user_id: video?.user_id ?? null,
        reason: 'inappropriate',
      });

      if (error) {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
        return;
      }

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review this content.',
        [{ text: 'OK' }]
      );
    },
    [user?.id, videos]
  );

  const handleBlockUser = useCallback(
    async (userId: string, username: string) => {
      if (!user?.id) return;

      const { error } = await supabase.from('blocked_users').insert({
        user_id: user.id,
        blocked_user_id: userId,
      });

      if (error) {
        Alert.alert('Error', 'Failed to block user. Please try again.');
        return;
      }

      setBlockedUsersSet((prev) => new Set(prev).add(userId));
      Alert.alert('Blocked', `@${username} has been blocked. You won't see their videos anymore.`);
    },
    [user?.id]
  );

  const handleFollowPress = useCallback(
    async (userId: string) => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase.rpc('toggle_follow', {
          target_user_id: userId,
        });

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['following-set'] });
        queryClient.invalidateQueries({ queryKey: ['follow-state', userId] });
      } catch {
        Alert.alert('Error', 'Failed to follow user. Please try again.');
      }
    },
    [user?.id, queryClient]
  );

  const handleRepliesPress = useCallback((videoId: string) => {
    setRepliesVideoId(videoId);
  }, []);

  const handleReplySelect = useCallback(
    (replyId: string) => {
      const rootId = repliesVideoId;
      setRepliesVideoId(null);
      router.push({
        pathname: '/replies/[id]',
        params: { id: rootId!, startReplyId: replyId },
      });
    },
    [router, repliesVideoId]
  );

  const handleDrawerRespond = useCallback(
    (videoId: string, agree: boolean) => {
      setRepliesVideoId(null);
      router.push({
        pathname: '/(modals)/response-upload',
        params: { parentVideoId: videoId, agreeDisagree: agree.toString() },
      });
    },
    [router]
  );

  const handleDrawerFollowUp = useCallback(
    (videoId: string) => {
      setRepliesVideoId(null);
      router.push({
        pathname: '/(modals)/response-upload',
        params: { parentVideoId: videoId, skipStance: 'true' },
      });
    },
    [router]
  );

  const handleRepliesClose = useCallback(() => {
    setRepliesVideoId(null);
  }, []);

  const filteredVideos = blockedUsersSet.size > 0
    ? videos.filter((v) => !blockedUsersSet.has(v.user_id))
    : videos;

  filteredVideosRef.current = filteredVideos;

  useEffect(() => {
    if (filteredVideos.length > 0 && activeIndex < filteredVideos.length) {
      const activeVideo = filteredVideos[activeIndex];
      const agreeCount = activeVideo.agree_responses_count || 0;
      const disagreeCount = activeVideo.disagree_responses_count || 0;
      const total = agreeCount + disagreeCount;
      const percent = total > 0 ? Math.round((agreeCount / total) * 100) : null;
      updateActivity(percent, activeVideo.movie_title || null);
    }
  }, [activeIndex, filteredVideos, updateActivity]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <VideoItem
        video={item}
        isActive={index === activeIndexRef.current && isFocusedRef.current}
        itemWidth={SCREEN_WIDTH}
        itemHeight={SCREEN_HEIGHT}
        currentUserId={user?.id}
        isFollowingAuthor={followingSet.has(item.user_id)}
        onResponsePress={handleResponsePress}
        onProfilePress={handleProfilePress}
        onRepliesPress={handleRepliesPress}
        onDeleteVideo={handleDeleteVideo}
        onReportVideo={handleReportVideo}
        onBlockUser={handleBlockUser}
        onFollowPress={handleFollowPress}
        onBookmarkPress={toggleBookmark}
        isBookmarked={bookmarkedIds.has(item.id)}
        topInset={insets.top}
        userStance={userStances.get(item.id) ?? null}
      />
    ),
    [SCREEN_WIDTH, SCREEN_HEIGHT, user?.id, followingSet, bookmarkedIds, userStances, toggleBookmark, handleResponsePress, handleProfilePress, handleRepliesPress, handleDeleteVideo, handleReportVideo, handleBlockUser, handleFollowPress, insets.top]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }, [hasMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.emptyText}>Loading videos...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No videos yet</Text>
        <Text style={styles.emptySubtext}>Be the first to share your opinion!</Text>
      </View>
    );
  }, [isLoading]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenHeightRef.current,
      offset: screenHeightRef.current * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: FeedVideo) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredVideos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={`${activeIndex}-${isFocused}-${user?.id}-${followingSet.size}-${bookmarkedIds.size}-${blockedUsersSet.size}-${userStances.size}`}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              isPullToRefresh.current = true;
              onRefresh();
            }}
            tintColor="#fff"
            progressViewOffset={50}
          />
        }
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={100}
      />
      <RepliesDrawer
        videoId={repliesVideoId}
        isOwnVideo={!!repliesVideoId && videos.some((v) => v.id === repliesVideoId && v.user_id === user?.id)}
        onClose={handleRepliesClose}
        onReplyPress={handleReplySelect}
        onRespondPress={handleDrawerRespond}
        onFollowUpPress={handleDrawerFollowUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoItem: {},
  footer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: STATIC_WIDTH,
    height: STATIC_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

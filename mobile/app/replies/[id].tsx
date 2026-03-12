// ============================================================================
// LewReviews Mobile - Replies Feed Screen
// Swipeable vertical feed of all replies for a root video
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import VideoPlayer, { toggleGlobalMute, getGlobalMuted } from '../../components/video/VideoPlayer';
import VideoCard from '../../components/video/VideoCard';
import { useInfiniteResponses } from '../../hooks/useResponseChain';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { VideoResponse } from '../../lib/video';
import type { FeedVideo } from '../../types';

// No module-scope dimensions — component uses useWindowDimensions() for consistency

// VideoResponse from feed_videos has the same shape as FeedVideo
function responseToFeedVideo(r: VideoResponse): FeedVideo {
  return r as unknown as FeedVideo;
}

interface ReplyItemProps {
  video: FeedVideo;
  isActive: boolean;
  itemWidth: number;
  itemHeight: number;
  currentUserId?: string;
  bottomInset: number;
  topInset: number;
  onProfilePress: (userId: string) => void;
  onResponsePress: (videoId: string, agree?: boolean) => void;
  onReportVideo?: (videoId: string) => void;
  onBlockUser?: (userId: string, username: string) => void;
  onBackPress?: () => void;
}

function ReplyItem({
  video,
  isActive,
  itemWidth,
  itemHeight,
  currentUserId,
  bottomInset,
  topInset,
  onProfilePress,
  onResponsePress,
  onReportVideo,
  onBlockUser,
  onBackPress,
}: ReplyItemProps) {
  const [isMuted, setIsMuted] = useState(() => getGlobalMuted());
  const toggleFnRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (isActive) {
      setIsMuted(getGlobalMuted());
    }
  }, [isActive]);

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
        isShareSheetOpen={false}
        hideProgressBar
        onRegisterToggle={handleRegisterToggle}
      />
      <VideoCard
        video={video}
        currentUserId={currentUserId}
        bottomInset={bottomInset}
        topInset={topInset}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onReportVideo={onReportVideo}
        onBlockUser={onBlockUser}
        onBackPress={onBackPress}
        onTap={handleTap}
      />
    </View>
  );
}

export default function RepliesFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const screenHeightRef = useRef(SCREEN_HEIGHT);
  screenHeightRef.current = SCREEN_HEIGHT;
  const { user } = useAuth();
  const { id: rootVideoId, startReplyId } = useLocalSearchParams<{
    id: string;
    startReplyId?: string;
  }>();

  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const hasScrolledToStart = useRef(false);

  // Fetch all replies for the root video
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteResponses(rootVideoId, 'all');

  const replies = useMemo(
    () => data?.pages.flatMap((page) => page.responses) ?? [],
    [data]
  );

  const feedVideos = useMemo(
    () => replies.map(responseToFeedVideo),
    [replies]
  );

  // Scroll to the tapped reply once data loads
  useEffect(() => {
    if (hasScrolledToStart.current || !startReplyId || feedVideos.length === 0) return;
    const idx = feedVideos.findIndex((v) => v.id === startReplyId);
    if (idx > 0) {
      hasScrolledToStart.current = true;
      // Use setTimeout to ensure FlatList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        activeIndexRef.current = idx;
        setActiveIndex(idx);
      }, 100);
    } else {
      hasScrolledToStart.current = true;
    }
  }, [feedVideos, startReplyId]);

  // Swipe indicator animation
  const indicatorOpacity = useSharedValue(1);

  useEffect(() => {
    if (feedVideos.length > 1) {
      // Fade out after 3 seconds
      indicatorOpacity.value = withDelay(
        3000,
        withTiming(0, { duration: 500 })
      );
    }
  }, [feedVideos.length, indicatorOpacity]);

  // Re-show indicator briefly on scroll
  useEffect(() => {
    if (feedVideos.length > 1) {
      indicatorOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(2000, withTiming(0, { duration: 500 }))
      );
    }
  }, [activeIndex, feedVideos.length, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
  }));

  const aboveCount = activeIndex;
  const belowCount = feedVideos.length - activeIndex - 1;

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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Back always goes to feed (pop entire stack back)
  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/feed');
    }
  }, [router]);

  const handleProfilePress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  const handleResponsePress = useCallback(
    (videoId: string, agree?: boolean) => {
      const params: Record<string, string> = { parentVideoId: rootVideoId! };
      if (agree !== undefined) {
        params.agreeDisagree = agree.toString();
      }
      router.push({
        pathname: '/(modals)/response-upload',
        params,
      });
    },
    [router, rootVideoId]
  );

  const handleReportVideo = useCallback(
    async (videoId: string) => {
      if (!user?.id) return;
      const video = feedVideos.find((v) => v.id === videoId);
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
      Alert.alert('Report Submitted', 'Thank you for your report. We will review this content.');
    },
    [user?.id, feedVideos]
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
      Alert.alert('Blocked', `@${username} has been blocked.`);
      if (router.canGoBack()) router.back();
    },
    [user?.id, router]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenHeightRef.current,
      offset: screenHeightRef.current * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: FeedVideo) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <ReplyItem
        video={item}
        isActive={index === activeIndexRef.current}
        itemWidth={SCREEN_WIDTH}
        itemHeight={SCREEN_HEIGHT}
        currentUserId={user?.id}
        bottomInset={insets.bottom + 16}
        topInset={insets.top}
        onProfilePress={handleProfilePress}
        onResponsePress={handleResponsePress}
        onReportVideo={handleReportVideo}
        onBlockUser={handleBlockUser}
        onBackPress={handleBackPress}
      />
    ),
    [SCREEN_WIDTH, SCREEN_HEIGHT, user?.id, insets.bottom, insets.top, handleProfilePress, handleResponsePress, handleReportVideo, handleBlockUser, handleBackPress]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (feedVideos.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Back button */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </TouchableOpacity>

        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <View style={styles.emptyIconInner}>
              <Ionicons name="chatbubbles-outline" size={32} color="rgba(255,255,255,0.25)" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No replies yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share your take on this review
          </Text>
          <TouchableOpacity
            style={styles.emptyReplyBtn}
            onPress={() => handleResponsePress(rootVideoId!)}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={16} color="#fff" />
            <Text style={styles.emptyReplyBtnText}>Record a Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyBackLink} onPress={handleBackPress}>
            <Text style={styles.emptyBackLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        ref={flatListRef}
        data={feedVideos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={`${activeIndex}-${user?.id}`}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />

      {/* Swipe indicator */}
      {feedVideos.length > 1 && (
        <Animated.View
          style={[
            styles.swipeIndicator,
            { bottom: insets.bottom + 20 },
            indicatorStyle,
          ]}
          pointerEvents="none"
        >
          {aboveCount > 0 && belowCount > 0 ? (
            <Text style={styles.swipeIndicatorText}>
              ↑ {aboveCount} · ↓ {belowCount} more
            </Text>
          ) : aboveCount > 0 ? (
            <Text style={styles.swipeIndicatorText}>
              ↑ {aboveCount} more
            </Text>
          ) : belowCount > 0 ? (
            <Text style={styles.swipeIndicatorText}>
              ↓ {belowCount} more
            </Text>
          ) : null}
        </Animated.View>
      )}
    </View>
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
  videoItem: {
    // width/height applied dynamically via inline style from useWindowDimensions()
  },
  backButton: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  swipeIndicatorText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    letterSpacing: -0.2,
  },
  emptyReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 22,
    marginBottom: 16,
  },
  emptyReplyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptyBackLink: {
    paddingVertical: 8,
  },
  emptyBackLinkText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: '500',
  },
});

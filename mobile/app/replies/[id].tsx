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
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
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
import type { VideoResponse } from '../../lib/video';
import type { FeedVideo } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// VideoResponse from feed_videos has the same shape as FeedVideo
function responseToFeedVideo(r: VideoResponse): FeedVideo {
  return r as unknown as FeedVideo;
}

interface ReplyItemProps {
  video: FeedVideo;
  isActive: boolean;
  currentUserId?: string;
  bottomInset: number;
  onProfilePress: (userId: string) => void;
  onResponsePress: (videoId: string) => void;
}

function ReplyItem({
  video,
  isActive,
  currentUserId,
  bottomInset,
  onProfilePress,
  onResponsePress,
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
    <View style={styles.videoItem}>
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
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onTap={handleTap}
      />
      {/* Mute button */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={handleMuteToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

export default function RepliesFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
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
    (videoId: string) => {
      router.push({
        pathname: '/(modals)/response-upload',
        params: { parentVideoId: rootVideoId! },
      });
    },
    [router, rootVideoId]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
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
        currentUserId={user?.id}
        bottomInset={insets.bottom + 16}
        onProfilePress={handleProfilePress}
        onResponsePress={handleResponsePress}
      />
    ),
    [user?.id, insets.bottom, handleProfilePress, handleResponsePress]
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
        <Text style={styles.emptyText}>No replies yet</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={handleBackPress}>
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </TouchableOpacity>
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

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={30} color="#fff" />
      </TouchableOpacity>

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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
  muteButton: {
    position: 'absolute',
    top: 75,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonAlt: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonAltText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

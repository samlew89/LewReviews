// ============================================================================
// LewReviews Mobile - VideoFeed Component
// TikTok-style full-screen swipeable vertical video feed
// ============================================================================

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import VideoPlayer from './VideoPlayer';
import VideoCard from './VideoCard';
import type { FeedVideo } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoFeedProps {
  videos: FeedVideo[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  likedVideoIds: Set<string>;
  onRefresh: () => void;
  onLoadMore: () => void;
  onLikePress: (videoId: string) => void;
}

interface VideoItemProps {
  video: FeedVideo;
  isActive: boolean;
  isLiked: boolean;
  onLikePress: (videoId: string) => void;
  onResponsePress: (videoId: string) => void;
  onProfilePress: (userId: string) => void;
  onSwipeLeft: (videoId: string) => void;
}

// Individual video item component
function VideoItem({
  video,
  isActive,
  isLiked,
  onLikePress,
  onResponsePress,
  onProfilePress,
  onSwipeLeft,
}: VideoItemProps) {
  const handleVideoEnd = useCallback(() => {
    // Video loops, so this is for analytics or auto-advance if needed
  }, []);

  const handleError = useCallback((_error: Error) => {
    // Video playback error - handled silently
  }, []);

  return (
    <View style={styles.videoItem}>
      <VideoPlayer
        videoUrl={video.video_url}
        thumbnailUrl={video.thumbnail_url}
        isActive={isActive}
        onVideoEnd={handleVideoEnd}
        onError={handleError}
      />
      <VideoCard
        video={video}
        isLiked={isLiked}
        onLikePress={onLikePress}
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onSwipeLeft={onSwipeLeft}
      />
    </View>
  );
}

// Memoized video item to prevent unnecessary re-renders
const MemoizedVideoItem = React.memo(VideoItem);

export default function VideoFeed({
  videos,
  isLoading,
  isRefreshing,
  hasMore,
  likedVideoIds,
  onRefresh,
  onLoadMore,
  onLikePress,
}: VideoFeedProps) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Viewability configuration for detecting which video is in view
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  // Handle viewable items change
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  // Handle response press - navigate to response flow
  const handleResponsePress = useCallback(
    (videoId: string) => {
      router.push({
        pathname: '/(modals)/agree-disagree',
        params: { parentVideoId: videoId },
      });
    },
    [router]
  );

  // Handle profile press - navigate to profile
  const handleProfilePress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  // Handle swipe left - navigate to response chain
  const handleSwipeLeft = useCallback(
    (videoId: string) => {
      router.push(`/video/${videoId}`);
    },
    [router]
  );

  // Render individual video item
  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <MemoizedVideoItem
        video={item}
        isActive={index === activeIndex}
        isLiked={likedVideoIds.has(item.id)}
        onLikePress={onLikePress}
        onResponsePress={handleResponsePress}
        onProfilePress={handleProfilePress}
        onSwipeLeft={handleSwipeLeft}
      />
    ),
    [activeIndex, likedVideoIds, onLikePress, handleResponsePress, handleProfilePress, handleSwipeLeft]
  );

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }, [hasMore]);

  // Render empty state
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

  // Get item layout for optimized scrolling
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    []
  );

  // Key extractor
  const keyExtractor = useCallback((item: FeedVideo) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            progressViewOffset={50}
          />
        }
        // Performance optimizations
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  footer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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

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
  onRefresh: () => void;
  onLoadMore: () => void;
}

interface VideoItemProps {
  video: FeedVideo;
  isActive: boolean;
  onResponsePress: (videoId: string) => void;
  onProfilePress: (userId: string) => void;
}

// Individual video item component
function VideoItem({
  video,
  isActive,
  onResponsePress,
  onProfilePress,
}: VideoItemProps) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

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
        isActive={isActive}
        isShareSheetOpen={isShareSheetOpen}
        onVideoEnd={handleVideoEnd}
        onError={handleError}
      />
      <VideoCard
        video={video}
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onShareSheetChange={setIsShareSheetOpen}
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
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Determine active video from scroll position — more reliable than onViewableItemsChanged
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
      setActiveIndex(index);
    },
    []
  );

  // Handle response press - navigate to response upload
  const handleResponsePress = useCallback(
    (videoId: string) => {
      router.push({
        pathname: '/(modals)/response-upload',
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

  // Render individual video item
  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <VideoItem
        video={item}
        isActive={index === activeIndex}
        onResponsePress={handleResponsePress}
        onProfilePress={handleProfilePress}
      />
    ),
    [activeIndex, handleResponsePress, handleProfilePress]
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
        extraData={activeIndex}
        pagingEnabled
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
            onRefresh={onRefresh}
            tintColor="#fff"
            progressViewOffset={50}
          />
        }
        // Performance optimizations
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

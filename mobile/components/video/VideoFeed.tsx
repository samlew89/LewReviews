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
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer, { toggleGlobalMute, getGlobalMuted } from './VideoPlayer';
import VideoCard from './VideoCard';
import RepliesDrawer from './RepliesDrawer';
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
  onRepliesPress: (videoId: string) => void;
}

// Individual video item component
function VideoItem({
  video,
  isActive,
  onResponsePress,
  onProfilePress,
  onRepliesPress,
}: VideoItemProps) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => getGlobalMuted());
  const toggleFnRef = useRef<(() => void) | null>(null);

  // Sync mute icon when this video becomes active
  React.useEffect(() => {
    if (isActive) {
      setIsMuted(getGlobalMuted());
    }
  }, [isActive]);

  // Sync mute icon when returning from another screen
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
    <View style={styles.videoItem}>
      <VideoPlayer
        videoUrl={video.video_url}
        isActive={isActive}
        isShareSheetOpen={isShareSheetOpen}
        onRegisterToggle={handleRegisterToggle}
      />
      <VideoCard
        video={video}
        onResponsePress={onResponsePress}
        onProfilePress={onProfilePress}
        onRepliesPress={onRepliesPress}
        onShareSheetChange={setIsShareSheetOpen}
        onTap={handleTap}
      />
      {/* Mute button (on top of everything) */}
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
  const activeIndexRef = useRef(0);
  const [repliesVideoId, setRepliesVideoId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const isFocusedRef = useRef(true);

  // Pause all videos when feed tab loses focus (e.g., switching to Profile, Discover, etc.)
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      setIsFocused(true);
      return () => {
        isFocusedRef.current = false;
        setIsFocused(false);
      };
    }, [])
  );

  // Determine active video from scroll position — more reliable than onViewableItemsChanged
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

  // Handle replies press — open drawer
  const handleRepliesPress = useCallback((videoId: string) => {
    setRepliesVideoId(videoId);
  }, []);

  // Handle tapping a reply in the drawer — navigate to that video
  const handleReplySelect = useCallback(
    (replyId: string) => {
      setRepliesVideoId(null);
      router.push(`/video/${replyId}`);
    },
    [router]
  );

  // Handle drawer close
  const handleRepliesClose = useCallback(() => {
    setRepliesVideoId(null);
  }, []);

  // Render individual video item — activeIndex and isFocused read from refs
  // so renderItem identity doesn't change on scroll/focus, preventing FlatList remounts
  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <VideoItem
        video={item}
        isActive={index === activeIndexRef.current && isFocusedRef.current}
        onResponsePress={handleResponsePress}
        onProfilePress={handleProfilePress}
        onRepliesPress={handleRepliesPress}
      />
    ),
    [handleResponsePress, handleProfilePress, handleRepliesPress]
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
        extraData={`${activeIndex}-${isFocused}`}
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
      <RepliesDrawer
        videoId={repliesVideoId}
        onClose={handleRepliesClose}
        onReplyPress={handleReplySelect}
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
});

// ============================================================================
// LewReviews Mobile - Feed Tab
// Main video feed with TikTok-style scrolling
// ============================================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import VideoFeed from '../../components/video/VideoFeed';
import { useVideoFeed } from '../../hooks/useVideoFeed';

export default function FeedScreen() {
  const {
    videos,
    isLoading,
    isRefreshing,
    hasMore,
    onRefresh,
    onLoadMore,
  } = useVideoFeed();

  return (
    <View style={styles.container}>
      <VideoFeed
        videos={videos}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        hasMore={hasMore}
        onRefresh={onRefresh}
        onLoadMore={onLoadMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

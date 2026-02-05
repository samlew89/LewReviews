import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useResponseChain } from '../../hooks/useResponseChain';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Video Detail Screen
 * Full-screen video with same overlay format as feed
 */
export default function VideoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    video,
    parentVideo,
    rootVideo,
    isLoading,
    isError,
    error,
  } = useResponseChain(id);

  // Determine if this is a response video directly from the video data
  const isResponse = !!video?.parent_video_id;

  // Debug - remove after testing
  console.log('VideoDetail:', {
    id,
    isResponse,
    hasRootVideo: !!rootVideo,
    parentVideoId: video?.parent_video_id,
    rootVideoId: video?.root_video_id,
    chainDepth: video?.chain_depth,
    videoKeys: video ? Object.keys(video) : [],
  });

  // Video player setup
  const player = useVideoPlayer(video?.video_url || '', (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.play();
  });

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Calculate consensus percentage
  const agreeCount = video?.vote_agree_count || 0;
  const disagreeCount = video?.vote_disagree_count || 0;
  const totalVotes = agreeCount + disagreeCount;
  const consensusPercent = totalVotes > 0 ? Math.round((agreeCount / totalVotes) * 100) : null;

  // Swipe gesture for navigating back to original video
  const translateY = useSharedValue(0);
  const SWIPE_THRESHOLD = 150;

  const navigateToOriginal = useCallback(() => {
    if (rootVideo) {
      router.replace(`/video/${rootVideo.id}`);
    }
  }, [rootVideo, router]);

  const swipeGesture = Gesture.Pan()
    .enabled(isResponse && !!rootVideo)
    .onUpdate((event) => {
      // Only allow downward swipe
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > SWIPE_THRESHOLD) {
        // Trigger navigation
        runOnJS(navigateToOriginal)();
      }
      // Spring back to original position
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - (translateY.value / (SWIPE_THRESHOLD * 2)),
  }));

  const handleBackPress = () => {
    router.back();
  };

  const handleOriginalThumbnailPress = () => {
    if (rootVideo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace(`/video/${rootVideo.id}`);
    }
  };

  const handleRespondPress = () => {
    if (!video) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Always respond to the original (root) video for flat response structure
    const targetVideo = rootVideo || video;
    router.push({
      pathname: '/(modals)/response-upload',
      params: {
        parentVideoId: targetVideo.id,
      },
    });
  };

  const handleProfilePress = () => {
    if (!video) return;
    router.push(`/profile/${video.user_id}`);
  };

  const handleViewResponses = () => {
    // Already on this page, but could navigate to responses list if needed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = useCallback(async () => {
    if (!video) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMessage = isResponse
      ? `Check out this response to "${video.title}" by @${video.username} on LewReviews`
      : `Check out "${video.title}" by @${video.username} on LewReviews`;

    try {
      await Share.share({
        message: shareMessage,
        // TODO: Add deep link URL when universal links are configured
        // url: `https://lewreviews.app/video/${video.id}`,
      });
    } catch {
      // User cancelled or share failed - no action needed
    }
  }, [video, isResponse]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  // Error state
  if (isError || !video) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>
          {error?.message || 'Video not found'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBackPress}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Full-screen video */}
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Mini thumbnail of original video (if this is a response) */}
      {isResponse && rootVideo && (
        <TouchableOpacity
          style={[styles.originalThumbnailContainer, { top: insets.top + 60 }]}
          onPress={handleOriginalThumbnailPress}
          activeOpacity={0.8}
        >
          <View style={styles.originalThumbnail}>
            {rootVideo.thumbnail_url ? (
              <Image
                source={{ uri: rootVideo.thumbnail_url }}
                style={styles.originalThumbnailImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.originalThumbnailPlaceholder}>
                <Ionicons name="videocam" size={24} color="#666" />
              </View>
            )}
          </View>
          <Text style={styles.originalLabel}>Original</Text>
        </TouchableOpacity>
      )}

      {/* Response badge (if this is a response) */}
      {isResponse && (
        <View style={[styles.responseBadgeContainer, { top: insets.top + (rootVideo ? 160 : 60) }]}>
          <View
            style={[
              styles.responseBadge,
              video.agree_disagree === true
                ? styles.agreeBadge
                : video.agree_disagree === false
                ? styles.disagreeBadge
                : styles.neutralBadge,
            ]}
          >
            <Ionicons
              name={
                video.agree_disagree === true
                  ? 'thumbs-up'
                  : video.agree_disagree === false
                  ? 'thumbs-down'
                  : 'chatbubble'
              }
              size={14}
              color="#fff"
            />
            <Text style={styles.responseBadgeText}>
              {video.agree_disagree === true
                ? 'Agrees'
                : video.agree_disagree === false
                ? 'Disagrees'
                : 'Response'}
            </Text>
          </View>
        </View>
      )}

      {/* Right side action buttons */}
      <View style={[styles.actionsContainer, { bottom: insets.bottom + 115 }]}>
        {/* View responses button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewResponses}
          activeOpacity={0.7}
        >
          <View style={styles.responsesIconContainer}>
            <Ionicons name="chevron-forward" size={28} color="#fff" />
            {(video.responses_count || 0) > 0 && (
              <View style={styles.responsesBadge}>
                <Text style={styles.responsesBadgeText}>
                  {formatCount(video.responses_count || 0)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.actionText}>Replies</Text>
        </TouchableOpacity>

        {/* Respond button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRespondPress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Respond</Text>
        </TouchableOpacity>

        {/* Consensus percentage (only show if there are responses with stances) */}
        {consensusPercent !== null && (
          <View style={styles.consensusContainer}>
            <Text style={[
              styles.consensusPercent,
              consensusPercent >= 50 ? styles.consensusAgree : styles.consensusDisagree
            ]}>
              {consensusPercent}%
            </Text>
            <Text style={styles.consensusLabel}>agree</Text>
          </View>
        )}

        {/* Share */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          {video.avatar_url ? (
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: video.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            </View>
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          )}
          <Text style={styles.actionText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom content: username, title, description */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 100 }]}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <Text style={styles.username}>@{video.username}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
        {video.description && (
          <Text style={styles.description} numberOfLines={2}>
            {video.description}
          </Text>
        )}
      </View>
      </Animated.View>
    </GestureDetector>
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
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalThumbnailContainer: {
    position: 'absolute',
    left: 16,
    alignItems: 'center',
  },
  originalThumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  originalThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  originalThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  responseBadgeContainer: {
    position: 'absolute',
    left: 16,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  agreeBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  disagreeBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  neutralBadge: {
    backgroundColor: 'rgba(90, 200, 250, 0.9)',
  },
  responseBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    gap: 22,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  consensusContainer: {
    alignItems: 'center',
    gap: 2,
  },
  consensusPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  consensusAgree: {
    color: '#34c759',
  },
  consensusDisagree: {
    color: '#ff3b30',
  },
  consensusLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  responsesIconContainer: {
    position: 'relative',
  },
  responsesBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ff2d55',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  responsesBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingRight: 80,
  },
  username: {
    marginBottom: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

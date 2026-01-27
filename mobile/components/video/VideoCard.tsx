// ============================================================================
// LewReviews Mobile - VideoCard Component
// Overlay UI with username, title, like button, response count, agree/disagree
// Swipe-left gesture opens response chain (per CLAUDE.md)
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { FeedVideo } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoCardProps {
  video: FeedVideo;
  isLiked: boolean;
  onLikePress: (videoId: string) => void;
  onResponsePress: (videoId: string) => void;
  onProfilePress: (userId: string) => void;
  onSwipeLeft?: (videoId: string) => void; // Opens response chain
}

const SWIPE_THRESHOLD = -80; // Negative for left swipe

export default function VideoCard({
  video,
  isLiked,
  onLikePress,
  onResponsePress,
  onProfilePress,
  onSwipeLeft,
}: VideoCardProps) {
  const router = useRouter();
  const translateX = useSharedValue(0);

  // Format number for display (e.g., 1.2K, 3.4M)
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  // Handle like button press
  const handleLikePress = useCallback(() => {
    onLikePress(video.id);
  }, [video.id, onLikePress]);

  // Handle response button press
  const handleResponsePress = useCallback(() => {
    onResponsePress(video.id);
  }, [video.id, onResponsePress]);

  // Handle profile press
  const handleProfilePress = useCallback(() => {
    onProfilePress(video.user_id);
  }, [video.user_id, onProfilePress]);

  // Handle view responses press
  const handleViewResponses = useCallback(() => {
    router.push(`/video/${video.id}`);
  }, [router, video.id]);

  // Handle swipe-left to open responses
  const handleSwipeLeftAction = useCallback(() => {
    if (onSwipeLeft) {
      onSwipeLeft(video.id);
    } else {
      // Default: navigate to video detail with responses
      router.push(`/video/${video.id}`);
    }
  }, [onSwipeLeft, video.id, router]);

  // Swipe gesture for opening response chain
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative X)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -120);
      }
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_THRESHOLD) {
        // Trigger response chain open
        runOnJS(handleSwipeLeftAction)();
      }
      // Spring back to original position
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  // Animated style for swipe feedback
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Determine if this is a response video
  const isResponse = video.parent_video_id !== null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
        {/* Swipe hint indicator */}
        <View style={styles.swipeHintContainer}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.4)" />
          <Text style={styles.swipeHintText}>Responses</Text>
        </View>

        {/* Agree/Disagree badge for response videos */}
        {isResponse && (
        <View style={styles.responseBadgeContainer}>
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
      <View style={styles.actionsContainer}>
        {/* Profile avatar */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {video.avatar_url ? (
              <Image
                source={{ uri: video.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Like button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLikePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? '#ff2d55' : '#fff'}
          />
          <Text style={styles.actionText}>{formatCount(video.likes_count)}</Text>
        </TouchableOpacity>

        {/* Response button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleResponsePress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>Respond</Text>
        </TouchableOpacity>

        {/* View responses button (if has responses) */}
        {video.responses_count > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewResponses}
            activeOpacity={0.7}
          >
            <View style={styles.responsesIconContainer}>
              <Ionicons name="git-branch-outline" size={28} color="#fff" />
              <View style={styles.responseCountBadge}>
                <Text style={styles.responseCountText}>
                  {formatCount(video.responses_count)}
                </Text>
              </View>
            </View>
            <Text style={styles.actionText}>Responses</Text>
          </TouchableOpacity>
        )}

        {/* Share button */}
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

        {/* Bottom content: username and title */}
        <View style={styles.bottomContent}>
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  swipeHintContainer: {
    position: 'absolute',
    right: -60,
    top: '50%',
    marginTop: -30,
    alignItems: 'center',
    opacity: 0.6,
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  responseBadgeContainer: {
    position: 'absolute',
    top: 100,
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
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  responsesIconContainer: {
    position: 'relative',
  },
  responseCountBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ff2d55',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  responseCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingRight: 80,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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

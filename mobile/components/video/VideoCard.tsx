// ============================================================================
// LewReviews Mobile - VideoCard Component
// Overlay UI with username, title, like button, response count, agree/disagree
// Swipe-left gesture opens response chain (per CLAUDE.md)
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { FeedVideo } from '../../types';

interface VideoCardProps {
  video: FeedVideo;
  onResponsePress: (videoId: string) => void;
  onProfilePress: (userId: string) => void;
  onSwipeLeft?: (videoId: string) => void; // Opens response chain
}

const SWIPE_THRESHOLD = -80; // Negative for left swipe
const HORIZONTAL_ACTIVATION = 15; // Horizontal offset before gesture activates
const VERTICAL_FAIL_OFFSET = 10; // Vertical offset that fails the gesture (allows scroll)

export default function VideoCard({
  video,
  onResponsePress,
  onProfilePress,
  onSwipeLeft,
}: VideoCardProps) {
  const router = useRouter();
  const translateX = useSharedValue(0);
  const hintBounce = useSharedValue(0);

  // Bounce animation for response hint when video has responses
  useEffect(() => {
    if (video.responses_count > 0) {
      // Delay, then bounce left-right to draw attention
      hintBounce.value = withDelay(
        800,
        withSequence(
          withTiming(8, { duration: 150 }),
          withTiming(-6, { duration: 150 }),
          withTiming(4, { duration: 120 }),
          withTiming(0, { duration: 100 })
        )
      );
    }
  }, [video.responses_count, hintBounce]);

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

  // Handle response button press
  const handleResponsePress = useCallback(() => {
    onResponsePress(video.id);
  }, [video.id, onResponsePress]);

  // Handle agree button press - go directly to response upload with stance
  const handleAgreePress = useCallback(() => {
    router.push({
      pathname: '/(modals)/response-upload',
      params: {
        parentVideoId: video.id,
        agreeDisagree: 'true',
        parentTitle: video.title,
        parentThumbnail: video.thumbnail_url || '',
      },
    });
  }, [router, video.id, video.title, video.thumbnail_url]);

  // Handle disagree button press - go directly to response upload with stance
  const handleDisagreePress = useCallback(() => {
    router.push({
      pathname: '/(modals)/response-upload',
      params: {
        parentVideoId: video.id,
        agreeDisagree: 'false',
        parentTitle: video.title,
        parentThumbnail: video.thumbnail_url || '',
      },
    });
  }, [router, video.id, video.title, video.thumbnail_url]);

  // Handle profile press
  const handleProfilePress = useCallback(() => {
    onProfilePress(video.user_id);
  }, [video.user_id, onProfilePress]);

  // Handle view responses press
  const handleViewResponses = useCallback(() => {
    router.push(`/video/${video.id}`);
  }, [router, video.id]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Handle swipe-left to open responses
  const handleSwipeLeftAction = useCallback(() => {
    triggerHaptic();
    if (onSwipeLeft) {
      onSwipeLeft(video.id);
    } else {
      // Default: navigate to video detail with responses
      router.push(`/video/${video.id}`);
    }
  }, [onSwipeLeft, video.id, router, triggerHaptic]);

  // Swipe gesture for opening response chain
  // Uses failOffsetY to allow vertical scroll priority
  const panGesture = Gesture.Pan()
    .activeOffsetX([-HORIZONTAL_ACTIVATION, HORIZONTAL_ACTIVATION])
    .failOffsetY([-VERTICAL_FAIL_OFFSET, VERTICAL_FAIL_OFFSET])
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

  // Animated style for swipe indicator (reveals as user swipes + bounce animation)
  const swipeIndicatorStyle = useAnimatedStyle(() => {
    const baseOpacity = video.responses_count > 0 ? 0.9 : 0.3;
    const opacity = interpolate(
      translateX.value,
      [0, -40, -80],
      [baseOpacity, 0.95, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, -40, -80],
      [1, 1.05, 1.1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [
        { translateX: hintBounce.value },
        { scale },
      ],
    };
  });

  // Determine if this is a response video
  const isResponse = video.parent_video_id !== null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
        {/* Animated swipe hint indicator - shows response arrow with count badge */}
        <Animated.View style={[styles.swipeHintContainer, swipeIndicatorStyle]}>
          <TouchableOpacity
            style={styles.swipeHintContent}
            onPress={handleViewResponses}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={22} color="#fff" />
            {video.responses_count > 0 && (
              <View style={styles.swipeHintBadge}>
                <Text style={styles.swipeHintBadgeText}>
                  {formatCount(video.responses_count)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

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
        {/* Response button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleResponsePress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Respond</Text>
        </TouchableOpacity>

        {/* Agree count */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAgreePress}
          activeOpacity={0.7}
        >
          <Ionicons name="thumbs-up-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{formatCount(video.agree_count || 0)}</Text>
        </TouchableOpacity>

        {/* Disagree count */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDisagreePress}
          activeOpacity={0.7}
        >
          <Ionicons name="thumbs-down-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{formatCount(video.disagree_count || 0)}</Text>
        </TouchableOpacity>

        {/* Share button */}
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

        {/* Bottom content: username and title */}
        <View style={styles.bottomContent}>
          <TouchableOpacity
            style={styles.userRow}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.miniAvatarContainer}>
              {video.avatar_url ? (
                <Image
                  source={{ uri: video.avatar_url }}
                  style={styles.miniAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.miniAvatarPlaceholder}>
                  <Ionicons name="person" size={14} color="#fff" />
                </View>
              )}
            </View>
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
    right: 12,
    top: '45%',
  },
  swipeHintContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  swipeHintBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff2d55',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  swipeHintBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingRight: 80,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
    marginRight: 8,
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
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

// ============================================================================
// LewReviews Mobile - VideoCard Component
// Overlay UI with username, title, response count, and consensus percentage
// Tap the Replies button to view replies
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { FeedVideo } from '../../types';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

interface VideoCardProps {
  video: FeedVideo;
  onResponsePress: (videoId: string) => void;
  onProfilePress: (userId: string) => void;
  onRepliesPress?: (videoId: string) => void;
  onShareSheetChange?: (isOpen: boolean) => void;
  onTap?: () => void;
}

export default function VideoCard({
  video,
  onResponsePress,
  onProfilePress,
  onRepliesPress,
  onShareSheetChange,
  onTap,
}: VideoCardProps) {
  const hintBounce = useSharedValue(0);

  // Calculate bottom offset to clear the tab bar (height already includes safe area padding)
  const bottomOffset = TAB_BAR_HEIGHT;

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

  // Determine if this is a response video
  const isResponse = video.parent_video_id !== null;

  // Calculate consensus percentage
  const agreeCount = video.vote_agree_count || 0;
  const disagreeCount = video.vote_disagree_count || 0;
  const totalVotes = agreeCount + disagreeCount;
  const consensusPercent = totalVotes > 0 ? Math.round((agreeCount / totalVotes) * 100) : null;

  // Handle response button press — always target root video for flat reply structure
  const handleResponsePress = useCallback(() => {
    const targetId = isResponse
      ? (video.root_video_id || video.parent_video_id || video.id)
      : video.id;
    onResponsePress(targetId);
  }, [video.id, video.root_video_id, video.parent_video_id, isResponse, onResponsePress]);

  // Handle profile press
  const handleProfilePress = useCallback(() => {
    onProfilePress(video.user_id);
  }, [video.user_id, onProfilePress]);

  // Handle view responses press — open replies drawer
  const handleViewResponses = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRepliesPress?.(video.id);
  }, [video.id, onRepliesPress]);

  // Handle share button press
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMessage = isResponse
      ? `Check out this response to "${video.title}" by @${video.username} on LewReviews`
      : `Check out "${video.title}" by @${video.username} on LewReviews`;

    onShareSheetChange?.(true);
    try {
      await Share.share({
        message: shareMessage,
        // TODO: Add deep link URL when universal links are configured
        // url: `https://lewreviews.app/video/${video.id}`,
      });
    } catch {
      // User cancelled or share failed - no action needed
    } finally {
      onShareSheetChange?.(false);
    }
  }, [video.id, video.title, video.username, isResponse, onShareSheetChange]);

  // Animated style for response button hint (bounce animation)
  const hintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintBounce.value }],
  }));

  return (
    <Pressable style={styles.container} onPress={onTap}>
      {/* Top left: consensus percentage */}
      {consensusPercent !== null && (
        <View style={styles.topLeftContainer}>
          <View style={[
            styles.consensusBadge,
            consensusPercent >= 50 ? styles.consensusBadgeAgree : styles.consensusBadgeDisagree,
          ]}>
            <Text style={styles.consensusBadgePercent}>{consensusPercent}%</Text>
            <Text style={styles.consensusBadgeLabel}>agree</Text>
          </View>
        </View>
      )}

      {/* Right side action buttons */}
      <View style={[styles.actionsContainer, { bottom: bottomOffset + 30 }]}>
        {/* View responses button — only show on root videos with replies (no nested chains) */}
        {!isResponse && video.responses_count > 0 && (
          <Animated.View style={hintAnimatedStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewResponses}
              activeOpacity={0.7}
            >
              <View style={styles.responsesIconContainer}>
                <Ionicons name="people" size={28} color="#fff" />
                <View style={styles.responsesBadge}>
                  <Text style={styles.responsesBadgeText}>
                    {formatCount(video.responses_count)}
                  </Text>
                </View>
              </View>
              <Text style={styles.actionText}>Replies</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stance icon — only on response videos */}
        {isResponse && (
          <View style={styles.actionButton}>
            <Ionicons
              name={video.agree_disagree === true ? 'checkmark-circle' : 'close-circle'}
              size={28}
              color={video.agree_disagree === true ? '#34C759' : '#FF3B30'}
            />
            <Text style={[
              styles.actionText,
              { color: video.agree_disagree === true ? '#34C759' : '#FF3B30' },
            ]}>
              {video.agree_disagree === true ? 'Agrees' : 'Disagrees'}
            </Text>
          </View>
        )}

        {/* Reply button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleResponsePress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>

        {/* Share button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Profile avatar */}
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

      {/* Bottom content: username and title */}
      <View style={[styles.bottomContent, { paddingBottom: bottomOffset + 16 }]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
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
  topLeftContainer: {
    position: 'absolute',
    top: 75,
    left: 16,
  },
  consensusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  consensusBadgeAgree: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  consensusBadgeDisagree: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  consensusBadgePercent: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  consensusBadgeLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
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
    paddingLeft: 12,
    paddingRight: 80,
  },
  username: {
    marginBottom: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

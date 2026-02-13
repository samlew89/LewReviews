import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useResponseChain } from '../../hooks/useResponseChain';
import { toggleGlobalMute, getGlobalMuted } from '../../components/video/VideoPlayer';
import RepliesDrawer from '../../components/video/RepliesDrawer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

/**
 * Video Detail Screen
 * Full-screen video with same overlay format as feed
 */
export default function VideoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [repliesVideoId, setRepliesVideoId] = useState<string | null>(null);

  const {
    video,
    responses,
    responseCounts,
    parentVideo,
    isResponse,
    isLoading,
    isError,
    error,
  } = useResponseChain(id);

  // Video player setup
  const [isMuted, setIsMuted] = useState(() => getGlobalMuted());
  const player = useVideoPlayer(video?.video_url || '', (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = getGlobalMuted();
    playerInstance.play();
  });

  // Ensure video plays when data loads (player may be created before URL is available)
  useEffect(() => {
    if (player && video?.video_url) {
      player.play();
    }
  }, [player, video?.video_url]);

  // Sync mute icon and player when returning from another screen
  useFocusEffect(
    useCallback(() => {
      setIsMuted(getGlobalMuted());
      if (player) {
        player.muted = getGlobalMuted();
      }
    }, [player])
  );

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

  const handleMuteToggle = useCallback(() => {
    const newMuted = toggleGlobalMute();
    setIsMuted(newMuted);
    if (player) {
      player.muted = newMuted;
    }
  }, [player]);

  const handleBackPress = () => {
    router.back();
  };

  const handleRespondPress = () => {
    if (!video) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(modals)/response-upload',
      params: { parentVideoId: video.id },
    });
  };

  const handleProfilePress = () => {
    if (!video) return;
    router.push(`/profile/${video.user_id}`);
  };

  const handleViewResponses = () => {
    if (responseCounts.total === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepliesVideoId(video?.id ?? null);
  };

  const handleReplySelect = useCallback(
    (replyId: string) => {
      setRepliesVideoId(null);
      router.push(`/video/${replyId}`);
    },
    [router]
  );

  const handleRepliesClose = useCallback(() => {
    setRepliesVideoId(null);
  }, []);

  const wasPlayingBeforeShare = useRef(false);

  const handleShare = useCallback(async () => {
    if (!video) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMessage = isResponse
      ? `Check out this response to "${video.title}" by @${video.username} on LewReviews`
      : `Check out "${video.title}" by @${video.username} on LewReviews`;

    // Save current playing state before the share sheet can pause the video
    wasPlayingBeforeShare.current = player.playing;

    try {
      await Share.share({
        message: shareMessage,
        // TODO: Add deep link URL when universal links are configured
        // url: `https://lewreviews.app/video/${video.id}`,
      });
    } catch {
      // User cancelled or share failed - no action needed
    } finally {
      // Restore playback state after share sheet dismisses
      setTimeout(() => {
        if (wasPlayingBeforeShare.current) {
          player.play();
        }
      }, 100);
    }
  }, [video, isResponse, player]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Full-screen video */}
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Mute button */}
      <TouchableOpacity
        style={[styles.muteButton, { top: insets.top + 10 }]}
        onPress={handleMuteToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Top left: consensus percentage or response badge */}
      {consensusPercent !== null ? (
        <View style={[styles.topLeftContainer, { top: insets.top + 60 }]}>
          <View style={[
            styles.consensusBadge,
            consensusPercent >= 50 ? styles.consensusBadgeAgree : styles.consensusBadgeDisagree,
          ]}>
            <Text style={styles.consensusBadgePercent}>{consensusPercent}%</Text>
            <Text style={styles.consensusBadgeLabel}>agree</Text>
          </View>
        </View>
      ) : isResponse ? (
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
                  ? 'checkmark-circle'
                  : video.agree_disagree === false
                  ? 'close-circle'
                  : 'chatbubble'
              }
              size={18}
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
      ) : null}

      {/* Right side action buttons */}
      <View style={[styles.actionsContainer, { bottom: TAB_BAR_HEIGHT + 30 }]}>
        {/* View responses button — only show when there are direct replies */}
        {responseCounts.total > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewResponses}
            activeOpacity={0.7}
          >
            <View style={styles.responsesIconContainer}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
              <View style={styles.responsesBadge}>
                <Text style={styles.responsesBadgeText}>
                  {formatCount(responseCounts.total)}
                </Text>
              </View>
            </View>
            <Text style={styles.actionText}>Replies</Text>
          </TouchableOpacity>
        )}

        {/* Reply button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRespondPress}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>

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
      <View style={[styles.bottomContent, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}>
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

      {/* Replies drawer */}
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
  muteButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLeftContainer: {
    position: 'absolute',
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
  responseBadgeContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
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
    fontSize: 15,
    fontWeight: '700',
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

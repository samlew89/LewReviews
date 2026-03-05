import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useResponseChain } from '../../hooks/useResponseChain';
import { toggleGlobalMute, getGlobalMuted } from '../../components/video/VideoPlayer';
import RepliesDrawer from '../../components/video/RepliesDrawer';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useBookmarks } from '../../hooks/useBookmarks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Video Detail Screen
 * Full-screen video with same overlay format as feed
 */
export default function VideoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const isOwnVideo = !!(user?.id && video?.user_id && user.id === video.user_id);
  const [isFollowing, setIsFollowing] = useState(false);
  const { bookmarkedIds, toggleBookmark } = useBookmarks(id ? [id] : []);

  // Fetch follow status for video author
  useEffect(() => {
    if (!user?.id || !video?.user_id || isOwnVideo) {
      setIsFollowing(false);
      return;
    }

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', video.user_id)
        .maybeSingle();

      setIsFollowing(!!data);
    };

    checkFollowStatus();
  }, [user?.id, video?.user_id, isOwnVideo]);

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

  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [lastAction, setLastAction] = useState<'pause' | 'play'>('play');
  const playIconOpacity = useSharedValue(0);
  const playIconScale = useSharedValue(0.5);

  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
    transform: [{ scale: playIconScale.value }],
  }));

  const flashPlayIcon = useCallback(() => {
    setShowPlayIcon(true);
    playIconOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 }, () => {
        runOnJS(setShowPlayIcon)(false);
      })
    );
    playIconScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 200 })
    );
  }, [playIconOpacity, playIconScale]);

  const handleTapToPause = useCallback(() => {
    if (player) {
      if (player.playing) {
        setLastAction('pause');
        player.pause();
      } else {
        setLastAction('play');
        player.play();
      }
      flashPlayIcon();
    }
  }, [player, flashPlayIcon]);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Calculate consensus percentage from actual response videos
  const agreeCount = video?.agree_responses_count || 0;
  const disagreeCount = video?.disagree_responses_count || 0;
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
    // Always target root video for flat reply structure
    const targetId = isResponse
      ? (video.root_video_id || video.parent_video_id || video.id)
      : video.id;
    router.push({
      pathname: '/(modals)/response-upload',
      params: { parentVideoId: targetId },
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
      const rootId = repliesVideoId || id;
      setRepliesVideoId(null);
      router.push({
        pathname: '/replies/[id]',
        params: { id: rootId!, startReplyId: replyId },
      });
    },
    [router, repliesVideoId, id]
  );

  const handleRepliesClose = useCallback(() => {
    setRepliesVideoId(null);
  }, []);

  const handleDrawerRespond = useCallback(
    (videoId: string, agree: boolean) => {
      setRepliesVideoId(null);
      router.push({
        pathname: '/(modals)/response-upload',
        params: { parentVideoId: videoId, agreeDisagree: agree.toString() },
      });
    },
    [router]
  );

  const handleDrawerFollowUp = useCallback(
    (videoId: string) => {
      setRepliesVideoId(null);
      router.push({
        pathname: '/(modals)/response-upload',
        params: { parentVideoId: videoId, skipStance: 'true' },
      });
    },
    [router]
  );

  const handleBookmarkPress = useCallback(() => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(id);
  }, [id, toggleBookmark]);

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

  const handleDeleteVideo = useCallback(async () => {
    if (!video) return;
    try {
      // Delete from storage (video file)
      if (video.video_url) {
        const videoPath = video.video_url.split('/videos/')[1];
        if (videoPath) {
          await supabase.storage.from('videos').remove([videoPath]);
        }
      }

      // Delete from storage (thumbnail)
      if (video.thumbnail_url) {
        const thumbPath = video.thumbnail_url.split('/thumbnails/')[1];
        if (thumbPath) {
          await supabase.storage.from('thumbnails').remove([thumbPath]);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase.from('videos').delete().eq('id', video.id);
      if (deleteError) throw deleteError;

      // If this was a response, refetch main feed so parent video's responses_count updates
      if (isResponse) {
        queryClient.refetchQueries({ queryKey: ['feed', undefined, undefined] });
      }

      Alert.alert('Deleted', 'Your video has been deleted.');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to delete video. Please try again.');
    }
  }, [video, router, isResponse, queryClient]);

  const handleFollowPress = useCallback(async () => {
    if (!user?.id || !video?.user_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error: rpcError } = await supabase.rpc('toggle_follow', {
        target_user_id: video.user_id,
      });

      if (rpcError) throw rpcError;
      setIsFollowing(!!data);
    } catch {
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  }, [user?.id, video?.user_id]);

  const showFollowButton = !isOwnVideo && !isFollowing && !!user?.id;

  const handleMorePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      const options = isOwnVideo
        ? ['Delete Video', 'Cancel']
        : ['Report Video', 'Cancel'];
      const destructiveButtonIndex = isOwnVideo ? 0 : undefined;
      const cancelButtonIndex = isOwnVideo ? 1 : 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (isOwnVideo && buttonIndex === 0) {
            Alert.alert(
              'Delete Video',
              'Are you sure you want to delete this video? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: handleDeleteVideo,
                },
              ]
            );
          } else if (!isOwnVideo && buttonIndex === 0) {
            Alert.alert(
              'Report Video',
              'Thank you for your report. We will review this content.',
              [{ text: 'OK' }]
            );
          }
        }
      );
    } else {
      if (isOwnVideo) {
        Alert.alert(
          'Video Options',
          '',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete Video',
              style: 'destructive',
              onPress: () => {
                Alert.alert(
                  'Delete Video',
                  'Are you sure you want to delete this video? This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: handleDeleteVideo,
                    },
                  ]
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Video Options',
          '',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Report Video',
              onPress: () => {
                Alert.alert(
                  'Report Video',
                  'Thank you for your report. We will review this content.',
                  [{ text: 'OK' }]
                );
              },
            },
          ]
        );
      }
    }
  }, [isOwnVideo, handleDeleteVideo]);

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

      {/* Tap to pause/play */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToPause} />

      {/* Play/pause flash icon */}
      {showPlayIcon && (
        <Animated.View style={[styles.playIconContainer, playIconAnimatedStyle]} pointerEvents="none">
          <Ionicons
            name={lastAction === 'pause' ? 'pause' : 'play'}
            size={80}
            color="rgba(255, 255, 255, 0.8)"
          />
        </Animated.View>
      )}

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 25 }]}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={35} color="#fff" />
      </TouchableOpacity>

      {/* Mute button */}
      <TouchableOpacity
        style={[styles.muteButton, { top: insets.top + 25 }]}
        onPress={handleMuteToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Top left: consensus percentage — only on root videos */}
      {!isResponse && consensusPercent !== null && (
        <View style={[styles.topLeftContainer, { top: insets.top + 60 }]}>
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
      <View style={[styles.actionsContainer, { bottom: insets.bottom + 30 }]}>
        {/* View responses button — only show on root videos with replies (no nested chains) */}
        {!isResponse && responseCounts.total > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewResponses}
            activeOpacity={0.7}
          >
            <View style={styles.responsesIconContainer}>
              <Ionicons name="people" size={35} color="#fff" />
              <View style={styles.responsesBadge}>
                <Text style={styles.responsesBadgeText}>
                  {formatCount(responseCounts.total)}
                </Text>
              </View>
            </View>
            <Text style={styles.actionText}>Replies</Text>
          </TouchableOpacity>
        )}

        {/* Stance icon — only on response videos */}
        {isResponse && (
          <View style={styles.actionButton}>
            <Ionicons
              name={video.agree_disagree === true ? 'checkmark-circle' : 'close-circle'}
              size={35}
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

        {/* Reply button — hidden on own root videos (can't reply to yourself) */}
        {!(isOwnVideo && !isResponse) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRespondPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={35} color="#fff" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        )}

        {/* Share */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={35} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleBookmarkPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={bookmarkedIds.has(id!) ? 'bookmark' : 'bookmark-outline'}
            size={35}
            color={bookmarkedIds.has(id!) ? '#f5c518' : '#fff'}
          />
          <Text style={styles.actionText}>{bookmarkedIds.has(id!) ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>

        {/* More menu */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMorePress}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={35} color="#fff" />
          <Text style={styles.actionText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom content: avatar + username, title */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.userRow}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              {video.avatar_url ? (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: video.avatar_url }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <Ionicons name="person-circle-outline" size={36} color="#fff" />
              )}
              {showFollowButton && (
                <TouchableOpacity
                  style={styles.followBadge}
                  onPress={handleFollowPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={12} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <Text style={styles.username}>@{video.username}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
      </View>

      {/* Replies drawer */}
      <RepliesDrawer
        videoId={repliesVideoId}
        isOwnVideo={isOwnVideo}
        onClose={handleRepliesClose}
        onReplyPress={handleReplySelect}
        onRespondPress={handleDrawerRespond}
        onFollowUpPress={handleDrawerFollowUp}
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
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionsContainer: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  followBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
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
    left: 12,
    bottom: 0,
    width: '65%',
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

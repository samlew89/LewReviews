// ============================================================================
// LewReviews Mobile - VideoCard Component
// Overlay UI: Dynamic Island consensus, Movie Context Card, action row
// Design: Feed V4 — Dynamic Island
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Pressable,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { FeedVideo } from '../../types';
import { RATING_LABELS, RATING_EMOJIS } from '../../types';

// Floating pill tab bar: 52px pill + ~35% safe area inset (~10px notch) + gap
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 72;

interface VideoCardProps {
  video: FeedVideo;
  currentUserId?: string;
  isFollowingAuthor?: boolean;
  onResponsePress: (videoId: string, agree?: boolean) => void;
  onProfilePress: (userId: string) => void;
  onRepliesPress?: (videoId: string) => void;
  onShareSheetChange?: (isOpen: boolean) => void;
  onDeleteVideo?: (videoId: string) => void;
  onReportVideo?: (videoId: string) => void;
  onBlockUser?: (userId: string, username: string) => void;
  onFollowPress?: (userId: string) => void;
  onBookmarkPress?: (videoId: string) => void;
  isBookmarked?: boolean;
  bottomInset?: number;
  topInset?: number;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  onBackPress?: () => void;
  onTap?: () => void;
  userStance?: boolean | null; // true=agreed, false=disagreed, undefined=not replied
}

export default function VideoCard({
  video,
  currentUserId,
  isFollowingAuthor,
  onResponsePress,
  onProfilePress,
  onRepliesPress,
  onShareSheetChange,
  onDeleteVideo,
  onReportVideo,
  onBlockUser,
  onFollowPress,
  onBookmarkPress,
  isBookmarked,
  bottomInset,
  topInset = 0,
  isMuted = false,
  onMuteToggle,
  onBackPress,
  onTap,
  userStance,
}: VideoCardProps) {
  const isOwnVideo = !!(currentUserId && currentUserId === video.user_id);
  const hasReplied = userStance !== undefined && userStance !== null;
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [titleTruncated, setTitleTruncated] = useState(false);

  const bottomOffset = bottomInset ?? TAB_BAR_HEIGHT;
  const isResponse = video.parent_video_id !== null;

  // Consensus percentage from response videos
  const agreeCount = video.agree_responses_count || 0;
  const disagreeCount = video.disagree_responses_count || 0;
  const totalVotes = agreeCount + disagreeCount;
  const consensusPercent = totalVotes > 0 ? Math.round((agreeCount / totalVotes) * 100) : null;

  // Target root video for response actions (flat reply structure)
  const rootTargetId = isResponse
    ? (video.root_video_id || video.parent_video_id || video.id)
    : video.id;

  // --- Callbacks ---

  const handleAgreePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onResponsePress(rootTargetId, true);
  }, [rootTargetId, onResponsePress]);

  const handleDisagreePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onResponsePress(rootTargetId, false);
  }, [rootTargetId, onResponsePress]);

  const handleRepliesPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRepliesPress?.(video.id);
  }, [video.id, onRepliesPress]);

  const handleProfilePress = useCallback(() => {
    onProfilePress(video.user_id);
  }, [video.user_id, onProfilePress]);

  const handleFollowPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFollowPress?.(video.user_id);
  }, [video.user_id, onFollowPress]);

  const handleReplyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onResponsePress(rootTargetId);
  }, [rootTargetId, onResponsePress]);

  const showFollowButton = !isOwnVideo && !isFollowingAuthor && !!onFollowPress;

  // Format number for display
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Handle more menu
  const handleMorePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      if (isOwnVideo) {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Share', 'Delete Video', 'Cancel'],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 2,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              handleShare();
            } else if (buttonIndex === 1) {
              Alert.alert(
                'Delete Video',
                'Are you sure you want to delete this video? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteVideo?.(video.id),
                  },
                ]
              );
            }
          }
        );
      } else {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Share', 'Report', 'Block User', 'Cancel'],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 3,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              handleShare();
            } else if (buttonIndex === 1) {
              onReportVideo?.(video.id);
            } else if (buttonIndex === 2) {
              Alert.alert(
                'Block User',
                `Block @${video.username}? You won't see their videos anymore.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Block',
                    style: 'destructive',
                    onPress: () => onBlockUser?.(video.user_id, video.username),
                  },
                ]
              );
            }
          }
        );
      }
    } else {
      if (isOwnVideo) {
        Alert.alert('Video Options', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => handleShare() },
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
                    onPress: () => onDeleteVideo?.(video.id),
                  },
                ]
              );
            },
          },
        ]);
      } else {
        Alert.alert('Video Options', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => handleShare() },
          {
            text: 'Report',
            onPress: () => onReportVideo?.(video.id),
          },
          {
            text: 'Block User',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Block User',
                `Block @${video.username}? You won't see their videos anymore.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Block',
                    style: 'destructive',
                    onPress: () => onBlockUser?.(video.user_id, video.username),
                  },
                ]
              );
            },
          },
        ]);
      }
    }
  }, [video.id, video.user_id, video.username, isOwnVideo, onDeleteVideo, onReportVideo, onBlockUser]);

  // Handle share
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareMessage = isResponse
      ? `Check out this response to "${video.title}" by @${video.username} on LewReviews`
      : `Check out "${video.title}" by @${video.username} on LewReviews`;

    onShareSheetChange?.(true);
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // User cancelled
    } finally {
      onShareSheetChange?.(false);
    }
  }, [video.title, video.username, isResponse, onShareSheetChange]);

  return (
    <Pressable style={styles.container} onPress={onTap}>
      {/* ── Top bar: context pill (left) + mute button (right) ── */}
      <View style={[styles.topRow, { top: topInset > 0 ? topInset + 4 : 50 }]}>
        {(video.movie_title || onBackPress) ? (
          <View style={styles.topBarPillOuter}>
            <BlurView intensity={30} tint="dark" style={styles.topBarPillBlur}>
              {onBackPress && (
                <TouchableOpacity
                  onPress={onBackPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.topBarBackBtn}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              )}
              {video.movie_title ? (
                <>
                  {video.tmdb_poster_path ? (
                    <Image
                      source={{ uri: video.tmdb_poster_path }}
                      style={styles.posterImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.posterPlaceholder}>
                      <Ionicons name="film-outline" size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  <Text style={styles.topBarTitle} numberOfLines={1}>
                    {video.movie_title}
                  </Text>
                  {video.tmdb_media_type && (
                    <Text style={styles.topBarSubtitle}>
                      ({video.tmdb_media_type === 'tv' ? 'TV' : 'Film'})
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.topBarTitle} numberOfLines={1}>Reply</Text>
              )}
            </BlurView>
          </View>
        ) : <View />}
        {onMuteToggle && (
          <TouchableOpacity
            onPress={onMuteToggle}
            activeOpacity={0.7}
            style={styles.standaloneMuteBtn}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Consensus % shown via Dynamic Island Live Activity (native iOS) */}

      {/* ── Bottom gradient scrim ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      {/* ── Bottom content: user info + action row ── */}
      <View style={[styles.bottomContent, { paddingBottom: bottomOffset + 12 }]}>
        {/* User row: avatar, @username, rating pill */}
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
                <Ionicons name="person-circle-outline" size={32} color="#fff" />
              )}
              {showFollowButton && (
                <TouchableOpacity
                  style={styles.followBadge}
                  onPress={handleFollowPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={10} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <Text style={styles.username}>@{video.username}</Text>
          </TouchableOpacity>
          {/* Rating pill (root videos) */}
          {!isResponse && video.rating && (
            <View style={styles.ratingPill}>
              <Text style={styles.ratingEmoji}>{RATING_EMOJIS[video.rating]}</Text>
              <Text style={styles.ratingText}>{RATING_LABELS[video.rating]}</Text>
            </View>
          )}
          {/* Stance pill (response videos) */}
          {isResponse && (
            <View style={[
              styles.stancePill,
              video.agree_disagree === true ? styles.stancePillAgree : styles.stancePillDisagree,
            ]}>
              <Ionicons
                name={video.agree_disagree === true ? 'checkmark' : 'close'}
                size={12}
                color={video.agree_disagree === true ? '#34C759' : '#FF3B30'}
              />
              <Text style={[
                styles.stanceText,
                { color: video.agree_disagree === true ? '#34C759' : '#FF3B30' },
              ]}>
                {video.agree_disagree === true ? 'Agrees' : 'Disagrees'}
              </Text>
            </View>
          )}
        </View>

        {/* Review text */}
        <Text
          style={styles.reviewText}
          numberOfLines={titleExpanded ? undefined : 2}
          onTextLayout={(e) => {
            if (!titleExpanded) {
              const lines = e.nativeEvent.lines;
              const renderedText = lines.map((l: any) => l.text).join('');
              setTitleTruncated(renderedText.length < video.title.length);
            }
          }}
        >
          {video.title}
          {titleExpanded && titleTruncated && (
            <Text style={styles.showLess} onPress={() => setTitleExpanded(false)}>
              {' ...less'}
            </Text>
          )}
        </Text>
        {!titleExpanded && titleTruncated && (
          <Text style={styles.showMore} onPress={() => setTitleExpanded(true)}>
            {'...more'}
          </Text>
        )}

        {/* ── Action Row ── */}
        <View style={styles.actionRow}>
          {/* STATE 1: Default — other user's root video, not yet replied */}
          {!isResponse && !isOwnVideo && !hasReplied && (
            <>
              <TouchableOpacity
                style={[styles.actionPill, styles.actionPillWide]}
                onPress={handleAgreePress}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color="#34C759" />
                <Text style={styles.actionPillText}>Agree</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, styles.actionPillWide]}
                onPress={handleDisagreePress}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#FF3B30" />
                <Text style={styles.actionPillText}>Disagree</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STATE 2: Own root video — Reply, Replies, Share */}
          {!isResponse && isOwnVideo && (
            <>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleReplyPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#fff" />
                <Text style={styles.actionPillText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleRepliesPress}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                {video.responses_count > 0 && (
                  <Text style={styles.actionPillText}>
                    {formatCount(video.responses_count)}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.actionPillText}>Share</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STATE 3: Already replied — stance badge, Reply, Replies */}
          {!isResponse && !isOwnVideo && hasReplied && (
            <>
              <View style={styles.actionPill}>
                <Ionicons
                  name={userStance ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={16}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.actionPillText}>
                  {userStance ? 'You agreed' : 'You disagreed'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleReplyPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#fff" />
                <Text style={styles.actionPillText}>Reply</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STATE 4: Response video — Original, Reply, Replies */}
          {isResponse && (
            <>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleRepliesPress}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.actionPillText}>Original</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleReplyPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#fff" />
                <Text style={styles.actionPillText}>Reply</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Replies button with count (non-own root videos + responses) */}
          {!isOwnVideo && (
            <TouchableOpacity
              style={styles.actionPill}
              onPress={handleRepliesPress}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              {video.responses_count > 0 && (
                <Text style={styles.actionPillText}>
                  {formatCount(video.responses_count)}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* More button (circle) */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleMorePress}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },

  // ── Top Row (movie card + mute on same level) ──
  topRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  // ── Top Bar Pill ──
  topBarPillOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexShrink: 1,
  },
  topBarPillBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 6,
    gap: 6,
  },
  topBarBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  posterPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  topBarSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  standaloneMuteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  // ── Bottom Scrim ──
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 340,
  },

  // ── Bottom Content ──
  bottomContent: {
    paddingHorizontal: 12,
  },

  // ── User Row ──
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatarWrapper: {
    position: 'relative',
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
  followBadge: {
    position: 'absolute',
    bottom: -3,
    left: '50%',
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Rating Pill ──
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  ratingEmoji: {
    fontSize: 11,
  },
  ratingText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Stance Pill (response videos) ──
  stancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  stancePillAgree: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  stancePillDisagree: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  stanceText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Review Text ──
  reviewText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  showMore: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },
  showLess: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Action Row ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    gap: 5,
  },
  actionPillWide: {
    flex: 2,
  },
  actionPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  moreButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

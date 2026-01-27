import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponseChain, StanceBadge } from '../../components/ResponseChain';
import { useResponseChain } from '../../hooks/useResponseChain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 16) / 9; // 9:16 aspect ratio

/**
 * Video Detail Screen
 *
 * Displays:
 * - Full video player
 * - Video info (title, description, stats)
 * - "Respond" button that opens agree-disagree modal
 * - If this is a response, shows "Response to [parent]" link
 * - ResponseChain component showing all responses
 */
export default function VideoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Fetch video and response chain data
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
  const player = useVideoPlayer(video?.video_url || '', (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.play();
  });

  const handleRespondPress = () => {
    if (!video) return;
    router.push({
      pathname: '/(modals)/agree-disagree',
      params: {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnail_url || '',
      },
    });
  };

  const handleParentVideoPress = () => {
    if (!parentVideo) return;
    router.push(`/video/${parentVideo.id}`);
  };

  const handleBackPress = () => {
    router.back();
  };

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
        <Pressable style={styles.retryButton} onPress={handleBackPress}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />

          {/* Back button overlay */}
          <Pressable
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={handleBackPress}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        {/* Parent video link (if this is a response) */}
        {isResponse && parentVideo && (
          <Pressable
            style={styles.parentVideoLink}
            onPress={handleParentVideoPress}
          >
            <View style={styles.parentVideoContent}>
              <StanceBadge
                isAgree={video.agree_disagree === true}
                size="small"
              />
              <Text style={styles.parentVideoText}>
                Response to{' '}
                <Text style={styles.parentVideoTitle}>
                  {parentVideo.title}
                </Text>
              </Text>
            </View>
            <Text style={styles.parentVideoArrow}>&gt;</Text>
          </Pressable>
        )}

        {/* Video Info Section */}
        <View style={styles.infoSection}>
          {/* User info */}
          <View style={styles.userRow}>
            {video.avatar_url ? (
              <Image
                source={{ uri: video.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>
                {video.display_name || video.username}
              </Text>
              <Text style={styles.username}>@{video.username}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{video.title}</Text>

          {/* Description (collapsible) */}
          {video.description && (
            <Pressable
              onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <Text
                style={styles.description}
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {video.description}
              </Text>
              {video.description.length > 150 && (
                <Text style={styles.showMoreText}>
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </Text>
              )}
            </Pressable>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{video.views_count}</Text>
              <Text style={styles.statLabel}>views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{video.likes_count}</Text>
              <Text style={styles.statLabel}>likes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{responseCounts.total}</Text>
              <Text style={styles.statLabel}>responses</Text>
            </View>
          </View>
        </View>

        {/* Respond Button */}
        <View style={styles.respondSection}>
          <Pressable
            style={({ pressed }) => [
              styles.respondButton,
              pressed && styles.respondButtonPressed,
            ]}
            onPress={handleRespondPress}
          >
            <Text style={styles.respondButtonText}>Respond to this video</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Response Chain */}
        <View style={styles.responseChainContainer}>
          <ResponseChain
            videoId={video.id}
            responses={responses}
            responseCounts={responseCounts}
            isLoading={false}
          />
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
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
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#111',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  parentVideoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  parentVideoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  parentVideoText: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  parentVideoTitle: {
    color: '#0a84ff',
    fontWeight: '500',
  },
  parentVideoArrow: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  infoSection: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    backgroundColor: '#444',
  },
  userInfo: {
    marginLeft: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: '#888',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  showMoreText: {
    fontSize: 14,
    color: '#0a84ff',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  respondSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  respondButton: {
    backgroundColor: '#0a84ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  respondButtonPressed: {
    backgroundColor: '#0070e0',
  },
  respondButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 8,
    backgroundColor: '#111',
  },
  responseChainContainer: {
    minHeight: 300,
  },
});

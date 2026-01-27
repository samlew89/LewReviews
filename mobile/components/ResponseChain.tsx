import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { VideoResponse, ResponseCounts } from '../hooks/useResponseChain';

interface ResponseChainProps {
  videoId: string;
  responses: VideoResponse[];
  responseCounts: ResponseCounts;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMoreResponses?: boolean;
}

/**
 * Displays a list of video responses with agree/disagree badges
 */
export function ResponseChain({
  videoId,
  responses,
  responseCounts,
  isLoading = false,
  onLoadMore,
  hasMoreResponses = false,
}: ResponseChainProps) {
  const router = useRouter();

  const handleResponsePress = (responseId: string) => {
    router.push(`/video/${responseId}`);
  };

  const renderResponseItem = ({ item }: { item: VideoResponse }) => (
    <ResponseItem response={item} onPress={() => handleResponsePress(item.id)} />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Responses</Text>
      <ResponseCountSummary counts={responseCounts} />
    </View>
  );

  const renderFooter = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No responses yet</Text>
        <Text style={styles.emptySubtext}>Be the first to respond!</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={responses}
        renderItem={renderResponseItem}
        estimatedItemSize={100}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={hasMoreResponses ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

/**
 * Summary showing count of agree/disagree responses
 */
interface ResponseCountSummaryProps {
  counts: ResponseCounts;
}

export function ResponseCountSummary({ counts }: ResponseCountSummaryProps) {
  if (counts.total === 0) {
    return null;
  }

  return (
    <View style={styles.countSummary}>
      {counts.agree > 0 && (
        <View style={styles.countItem}>
          <View style={[styles.countBadge, styles.agreeBadge]} />
          <Text style={styles.countText}>{counts.agree} agree</Text>
        </View>
      )}
      {counts.disagree > 0 && (
        <View style={styles.countItem}>
          <View style={[styles.countBadge, styles.disagreeBadge]} />
          <Text style={styles.countText}>{counts.disagree} disagree</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Individual response item in the list
 */
interface ResponseItemProps {
  response: VideoResponse;
  onPress: () => void;
}

function ResponseItem({ response, onPress }: ResponseItemProps) {
  const isAgree = response.agree_disagree === true;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.responseItem,
        pressed && styles.responseItemPressed,
      ]}
      onPress={onPress}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {response.thumbnail_url ? (
          <Image
            source={{ uri: response.thumbnail_url }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
        )}
        {/* Stance badge overlay */}
        <View
          style={[
            styles.stanceBadge,
            isAgree ? styles.agreeBadgeOverlay : styles.disagreeBadgeOverlay,
          ]}
        >
          <Text style={styles.stanceBadgeText}>
            {isAgree ? 'AGREE' : 'DISAGREE'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.responseContent}>
        <Text style={styles.responseTitle} numberOfLines={2}>
          {response.title}
        </Text>
        <View style={styles.responseMetadata}>
          {/* User info */}
          <View style={styles.userInfo}>
            {response.avatar_url ? (
              <Image
                source={{ uri: response.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <Text style={styles.username} numberOfLines={1}>
              @{response.username}
            </Text>
          </View>
          {/* Stats */}
          <View style={styles.stats}>
            <Text style={styles.statText}>{response.likes_count} likes</Text>
            <Text style={styles.statSeparator}>|</Text>
            <Text style={styles.statText}>
              {response.responses_count} responses
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Compact badge for showing agree/disagree status
 */
interface StanceBadgeProps {
  isAgree: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function StanceBadge({ isAgree, size = 'medium' }: StanceBadgeProps) {
  const sizeStyles = {
    small: styles.stanceBadgeSmall,
    medium: styles.stanceBadgeMedium,
    large: styles.stanceBadgeLarge,
  };

  return (
    <View
      style={[
        styles.stanceBadgeInline,
        isAgree ? styles.agreeBadgeInline : styles.disagreeBadgeInline,
        sizeStyles[size],
      ]}
    >
      <Text
        style={[
          styles.stanceBadgeInlineText,
          size === 'small' && styles.stanceBadgeSmallText,
          size === 'large' && styles.stanceBadgeLargeText,
        ]}
      >
        {isAgree ? 'AGREE' : 'DISAGREE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  countSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agreeBadge: {
    backgroundColor: '#22c55e',
  },
  disagreeBadge: {
    backgroundColor: '#ef4444',
  },
  countText: {
    fontSize: 14,
    color: '#888',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
  },
  responseItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  responseItemPressed: {
    backgroundColor: '#111',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#222',
  },
  stanceBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agreeBadgeOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  disagreeBadgeOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  stanceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  responseContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  responseTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 8,
  },
  responseMetadata: {
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    backgroundColor: '#444',
  },
  username: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  statSeparator: {
    color: '#444',
  },
  // Inline stance badge styles
  stanceBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  agreeBadgeInline: {
    backgroundColor: '#22c55e',
  },
  disagreeBadgeInline: {
    backgroundColor: '#ef4444',
  },
  stanceBadgeInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  stanceBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stanceBadgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stanceBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stanceBadgeSmallText: {
    fontSize: 9,
  },
  stanceBadgeLargeText: {
    fontSize: 13,
  },
});

export default ResponseChain;

// ============================================================================
// LewReviews Mobile - ReplyListItem Component
// Individual reply row for the RepliesDrawer bottom sheet
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { VideoResponse } from '../../lib/video';

interface ReplyListItemProps {
  reply: VideoResponse;
  onPress: (replyId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

function ReplyListItemInner({ reply, onPress }: ReplyListItemProps) {
  const isAgree = reply.agree_disagree === true;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(reply.id)}
      activeOpacity={0.6}
    >
      {/* Avatar */}
      {reply.avatar_url ? (
        <Image
          source={{ uri: reply.avatar_url }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person-circle-outline" size={40} color="#555" />
        </View>
      )}

      {/* Middle: username, stance, title, time */}
      <View style={styles.textContent}>
        <View style={styles.topRow}>
          <Text style={styles.username} numberOfLines={1}>
            @{reply.username}
          </Text>
          <View
            style={[
              styles.stanceBadge,
              isAgree ? styles.agreeBadge : styles.disagreeBadge,
            ]}
          >
            <Ionicons
              name={isAgree ? 'checkmark' : 'close'}
              size={11}
              color="#fff"
            />
            <Text style={styles.stanceText}>
              {isAgree ? 'Agrees' : 'Disagrees'}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {reply.title}
        </Text>
        <Text style={styles.timestamp}>
          {formatRelativeTime(reply.created_at)}
        </Text>
      </View>

      {/* Thumbnail */}
      {reply.thumbnail_url ? (
        <Image
          source={{ uri: reply.thumbnail_url }}
          style={styles.thumbnail}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailFallback]}>
          <Ionicons name="videocam" size={20} color="#555" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const ReplyListItem = React.memo(ReplyListItemInner);
export default ReplyListItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  stanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  agreeBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.85)',
  },
  disagreeBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.85)',
  },
  stanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 6,
  },
  thumbnailFallback: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

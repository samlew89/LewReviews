import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

/**
 * Agree/Disagree Modal
 *
 * Allows users to select their stance before recording a video response.
 * Shows thumbnail of the video being responded to.
 * On selection, navigates to response-upload with stance param.
 */
export default function AgreeDisagreeModal() {
  const router = useRouter();
  const { parentVideoId, title, thumbnailUrl } = useLocalSearchParams<{
    parentVideoId: string;
    title?: string;
    thumbnailUrl?: string;
  }>();
  const videoId = parentVideoId;

  // Fetch video details if not provided via params
  const { data: video, isLoading } = useQuery({
    queryKey: ['video-for-response', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const { data, error } = await supabase
        .from('feed_videos')
        .select('id, title, thumbnail_url, username, display_name')
        .eq('id', videoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!videoId && (!title || !thumbnailUrl),
  });

  const displayTitle = title || video?.title || 'Video';
  const displayThumbnail = thumbnailUrl || video?.thumbnail_url;
  const displayUsername = video?.username;

  const handleStanceSelect = (agreeDisagree: boolean) => {
    // Navigate to response upload with stance
    router.push({
      pathname: '/(modals)/response-upload',
      params: {
        parentVideoId: videoId,
        agreeDisagree: agreeDisagree.toString(),
        parentTitle: displayTitle,
        parentThumbnail: displayThumbnail || '',
      },
    });
  };

  const handleClose = () => {
    router.back();
  };

  if (!videoId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: No video specified</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Prompt */}
        <Text style={styles.prompt}>Take your side</Text>

        {/* Video being responded to */}
        <View style={styles.videoPreview}>
          {isLoading ? (
            <View style={styles.thumbnailLoading}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          ) : displayThumbnail ? (
            <Image
              source={{ uri: displayThumbnail }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="videocam" size={24} color="#444" />
            </View>
          )}
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {displayTitle}
            </Text>
            {displayUsername && (
              <Text style={styles.videoUsername}>@{displayUsername}</Text>
            )}
          </View>
        </View>

        {/* Stance Cards */}
        <View style={styles.stanceCards}>
          <Pressable
            style={({ pressed }) => [
              styles.stanceCard,
              pressed && styles.stanceCardPressed,
            ]}
            onPress={() => handleStanceSelect(true)}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.stanceCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.stanceIconCircle}>
                <Ionicons name="checkmark" size={32} color="#22c55e" />
              </View>
              <Text style={styles.stanceCardTitle}>Agree</Text>
              <Text style={styles.stanceCardSubtitle}>This take is right</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.stanceCard,
              pressed && styles.stanceCardPressed,
            ]}
            onPress={() => handleStanceSelect(false)}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.stanceCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.stanceIconCircle}>
                <Ionicons name="close" size={32} color="#ef4444" />
              </View>
              <Text style={styles.stanceCardTitle}>Disagree</Text>
              <Text style={styles.stanceCardSubtitle}>I see it differently</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
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
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  prompt: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },
  videoPreview: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#222',
  },
  thumbnail: {
    width: 56,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  thumbnailLoading: {
    width: 56,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  videoUsername: {
    fontSize: 13,
    color: '#666',
  },
  stanceCards: {
    flexDirection: 'row',
    gap: 12,
  },
  stanceCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  stanceCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  stanceCardGradient: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  stanceIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stanceCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  stanceCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
});

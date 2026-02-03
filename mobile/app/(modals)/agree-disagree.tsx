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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Respond to Video</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
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
              <Text style={styles.placeholderText}>No thumbnail</Text>
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

        {/* Stance selection prompt */}
        <Text style={styles.prompt}>Do you agree or disagree?</Text>
        <Text style={styles.promptSubtext}>
          Select your stance to start recording your response
        </Text>

        {/* Stance buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.stanceButton,
              styles.agreeButton,
              pressed && styles.agreeButtonPressed,
            ]}
            onPress={() => handleStanceSelect(true)}
          >
            <View style={styles.buttonIconWrapper}>
              <Ionicons name="thumbs-up" size={32} color="#fff" />
            </View>
            <View style={styles.buttonTextWrapper}>
              <Text style={styles.buttonText}>I Agree</Text>
              <Text style={styles.buttonSubtext}>
                Support this take
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.stanceButton,
              styles.disagreeButton,
              pressed && styles.disagreeButtonPressed,
            ]}
            onPress={() => handleStanceSelect(false)}
          >
            <View style={[styles.buttonIconWrapper, styles.disagreeIconWrapper]}>
              <Ionicons name="thumbs-down" size={32} color="#fff" />
            </View>
            <View style={styles.buttonTextWrapper}>
              <Text style={styles.buttonText}>I Disagree</Text>
              <Text style={styles.buttonSubtext}>
                Counter this take
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.5)" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#ff2d55',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  videoPreview: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#222',
  },
  thumbnail: {
    width: 72,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  thumbnailLoading: {
    width: 72,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 6,
  },
  videoUsername: {
    fontSize: 13,
    color: '#888',
  },
  prompt: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  promptSubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 14,
  },
  stanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  agreeButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  agreeButtonPressed: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  disagreeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  disagreeButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  buttonIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disagreeIconWrapper: {
    backgroundColor: '#ef4444',
  },
  buttonTextWrapper: {
    flex: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  buttonSubtext: {
    fontSize: 13,
    color: '#888',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
});

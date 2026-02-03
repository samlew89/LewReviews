// ============================================================================
// LewReviews Mobile - Response Upload Modal
// ============================================================================
// Modal for uploading video responses to existing videos.
// Receives parentVideoId and agreeDisagree as route parameters.
// Shows "Responding to [video]" header with agree/disagree selection.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UploadForm } from '../../components/video/UploadForm';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadInput, Video } from '../../types';
import { supabase } from '../../lib/supabase';

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  parentVideoId: string;
  agreeDisagree?: string; // 'true' | 'false' | undefined
}

// ============================================================================
// Component
// ============================================================================

export default function ResponseUploadModal() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();

  // Extract route params
  const parentVideoId = params.parentVideoId;
  const initialAgreeDisagree = params.agreeDisagree
    ? params.agreeDisagree === 'true'
    : undefined;

  // Parent video state
  const [parentVideo, setParentVideo] = useState<Video | null>(null);
  const [isLoadingParent, setIsLoadingParent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Upload hook
  const {
    progress,
    selectedVideo,
    thumbnailUri,
    pickFromGallery,
    recordVideo,
    generateThumbnail,
    uploadVideo,
    reset,
  } = useVideoUpload();

  /**
   * Fetch parent video details
   */
  useEffect(() => {
    async function fetchParentVideo() {
      if (!parentVideoId) {
        setLoadError('No parent video specified');
        setIsLoadingParent(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, user_id, thumbnail_url, chain_depth')
          .eq('id', parentVideoId)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error('Video not found');
        }

        // Check chain depth limit
        if (data.chain_depth >= 10) {
          setLoadError('Maximum response chain depth reached (10 levels)');
          setIsLoadingParent(false);
          return;
        }

        setParentVideo(data as Video);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Failed to load video'
        );
      } finally {
        setIsLoadingParent(false);
      }
    }

    fetchParentVideo();
  }, [parentVideoId]);

  /**
   * Handle video pick from gallery
   */
  const handlePickFromGallery = useCallback(async () => {
    const video = await pickFromGallery();
    if (video) {
      await generateThumbnail(video.uri);
    }
  }, [pickFromGallery, generateThumbnail]);

  /**
   * Handle video recording
   */
  const handleRecordVideo = useCallback(async () => {
    const video = await recordVideo();
    if (video) {
      await generateThumbnail(video.uri);
    }
  }, [recordVideo, generateThumbnail]);

  /**
   * Handle upload submission
   */
  const handleUpload = useCallback(
    async (input: VideoUploadInput) => {
      // Ensure parentVideoId is set
      const uploadInput: VideoUploadInput = {
        ...input,
        parentVideoId,
      };

      const result = await uploadVideo(uploadInput);

      if (result.success) {
        Alert.alert(
          'Response Posted!',
          'Your video response has been uploaded successfully.',
          [
            {
              text: 'View Response',
              onPress: () => {
                reset();
                if (result.video) {
                  router.push(`/video/${result.video.id}`);
                } else {
                  router.back();
                }
              },
            },
            {
              text: 'Done',
              onPress: () => {
                reset();
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Upload Failed',
          result.error ||
            'An error occurred while uploading your response. Please try again.',
          [{ text: 'OK' }]
        );
      }
    },
    [parentVideoId, uploadVideo, reset, router]
  );

  /**
   * Handle cancel/close modal
   */
  const handleCancel = useCallback(() => {
    if (selectedVideo || progress.stage !== 'idle') {
      Alert.alert(
        'Discard Response?',
        'Are you sure you want to discard your video response?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              reset();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [selectedVideo, progress.stage, reset, router]);

  // Loading state
  if (isLoadingParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff2d55" />
          <Text style={styles.loadingText}>Loading video details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (loadError || !parentVideo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>
            {loadError || 'Could not load the video you want to respond to.'}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Post Response</Text>
          <Text style={styles.headerSubtitle}>
            Share your thoughts on this video
          </Text>
        </View>
      </View>

      {/* Upload Form with Response Props */}
      <UploadForm
        selectedVideo={selectedVideo}
        thumbnailUri={thumbnailUri}
        progress={progress}
        parentVideoId={parentVideoId}
        parentVideoTitle={parentVideo.title}
        agreeDisagree={initialAgreeDisagree}
        onPickFromGallery={handlePickFromGallery}
        onRecordVideo={handleRecordVideo}
        onUpload={handleUpload}
        onCancel={handleCancel}
        submitButtonText="Post Response"
        showAgreeDisagree={true}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#ff2d55',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000',
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ef4444',
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 40,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#ff2d55',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

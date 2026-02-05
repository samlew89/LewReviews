// ============================================================================
// LewReviews Mobile - Create Video Screen
// ============================================================================
// Main screen for creating and uploading new videos.
// Allows users to pick from gallery or record with camera.
// ============================================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UploadForm } from '../../components/video/UploadForm';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadInput } from '../../types';

export default function CreateScreen() {
  const router = useRouter();
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
   * Handle video pick from gallery
   */
  const handlePickFromGallery = useCallback(async () => {
    const video = await pickFromGallery();
    if (video) {
      // Generate thumbnail after picking
      await generateThumbnail(video.uri);
    }
  }, [pickFromGallery, generateThumbnail]);

  /**
   * Handle video recording
   */
  const handleRecordVideo = useCallback(async () => {
    const video = await recordVideo();
    if (video) {
      // Generate thumbnail after recording
      await generateThumbnail(video.uri);
    }
  }, [recordVideo, generateThumbnail]);

  /**
   * Handle upload submission
   */
  const handleUpload = useCallback(async (input: VideoUploadInput) => {
    const result = await uploadVideo(input);

    if (result.success) {
      Alert.alert(
        'Success!',
        'Your video has been uploaded successfully.',
        [
          {
            text: 'View Video',
            onPress: () => {
              reset();
              // Navigate to the uploaded video
              if (result.video) {
                router.push(`/video/${result.video.id}`);
              } else {
                router.push('/(tabs)');
              }
            },
          },
          {
            text: 'Create Another',
            onPress: () => {
              reset();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Upload Failed',
        result.error || 'An error occurred while uploading your video. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [uploadVideo, reset, router]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    if (selectedVideo || progress.stage !== 'idle') {
      Alert.alert(
        'Discard Video?',
        'Are you sure you want to discard your video?',
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What's your take?</Text>
      </View>

      {/* Upload Form */}
      <UploadForm
        selectedVideo={selectedVideo}
        thumbnailUri={thumbnailUri}
        progress={progress}
        onPickFromGallery={handlePickFromGallery}
        onRecordVideo={handleRecordVideo}
        onUpload={handleUpload}
        onCancel={handleCancel}
        submitButtonText="Post Review"
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
});

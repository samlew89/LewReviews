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

  const handlePickFromGallery = useCallback(async () => {
    const video = await pickFromGallery();
    if (video) {
      await generateThumbnail(video.uri);
    }
  }, [pickFromGallery, generateThumbnail]);

  const handleRecordVideo = useCallback(async () => {
    const video = await recordVideo();
    if (video) {
      await generateThumbnail(video.uri);
    }
  }, [recordVideo, generateThumbnail]);

  const handleUpload = useCallback(async (input: VideoUploadInput) => {
    const result = await uploadVideo(input);

    if (result.success) {
      reset();
      // Navigate to feed so user sees their new video at the top
      router.replace('/(tabs)/feed');
    } else {
      Alert.alert(
        'Upload Failed',
        result.error || 'Something went wrong. Try again.',
        [{ text: 'OK' }]
      );
    }
  }, [uploadVideo, reset, router]);

  const handleCancel = useCallback(() => {
    if (selectedVideo || progress.stage !== 'idle') {
      Alert.alert(
        'Discard?',
        'Your video will be lost.',
        [
          { text: 'Keep', style: 'cancel' },
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Review</Text>
        <View style={styles.headerRule} />
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EDEDED',
    letterSpacing: -0.8,
  },
  headerRule: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginTop: 14,
  },
});

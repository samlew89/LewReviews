import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UploadForm } from '../../components/video/UploadForm';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadInput } from '../../types';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

export default function CreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const hasUnsavedWorkRef = useRef(false);
  const [formKey, setFormKey] = useState(0);

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

  // Clear form when user navigates away from Create tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      hasUnsavedWorkRef.current = false;
      reset();
      setFormKey((k) => k + 1);
    });
    return unsubscribe;
  }, [navigation, reset]);

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
      hasUnsavedWorkRef.current = false;
      reset();
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
    if (hasUnsavedWorkRef.current) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved work that will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              hasUnsavedWorkRef.current = false;
              reset();
              setFormKey((k) => k + 1);
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [reset, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: TAB_BAR_HEIGHT }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Review</Text>
        <View style={styles.headerRule} />
      </View>

      <UploadForm
        key={formKey}
        selectedVideo={selectedVideo}
        thumbnailUri={thumbnailUri}
        progress={progress}
        onPickFromGallery={handlePickFromGallery}
        onRecordVideo={handleRecordVideo}
        onUpload={handleUpload}
        onCancel={handleCancel}
        submitButtonText="Post Review"
        hasUnsavedWorkRef={hasUnsavedWorkRef}
      />
    </View>
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

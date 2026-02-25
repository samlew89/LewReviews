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
import { Ionicons } from '@expo/vector-icons';
import { UploadForm } from '../../components/video/UploadForm';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadInput, Video } from '../../types';
import { supabase } from '../../lib/supabase';

interface RouteParams {
  parentVideoId: string;
  agreeDisagree?: string;
}

export default function ResponseUploadModal() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();

  const rawParentVideoId = params.parentVideoId;
  const initialAgreeDisagree = params.agreeDisagree
    ? params.agreeDisagree === 'true'
    : undefined;

  const [parentVideo, setParentVideo] = useState<Video | null>(null);
  const [resolvedParentId, setResolvedParentId] = useState<string | undefined>(rawParentVideoId);
  const [isLoadingParent, setIsLoadingParent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchParentVideo() {
      if (!rawParentVideoId) {
        setLoadError('No parent video specified');
        setIsLoadingParent(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, user_id, thumbnail_url, chain_depth, parent_video_id, root_video_id')
          .eq('id', rawParentVideoId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Video not found');

        // Flatten: if this video is itself a response, redirect to its root
        if (data.parent_video_id) {
          const rootId = data.root_video_id || data.parent_video_id;
          const { data: rootData, error: rootError } = await supabase
            .from('videos')
            .select('id, title, user_id, thumbnail_url, chain_depth')
            .eq('id', rootId)
            .single();

          if (rootError) throw rootError;
          if (!rootData) throw new Error('Root video not found');

          setResolvedParentId(rootId);
          setParentVideo(rootData as Video);
        } else {
          setResolvedParentId(data.id);
          setParentVideo(data as Video);
        }
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Failed to load video'
        );
      } finally {
        setIsLoadingParent(false);
      }
    }

    fetchParentVideo();
  }, [rawParentVideoId]);

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

  const handleUpload = useCallback(
    async (input: VideoUploadInput) => {
      const uploadInput: VideoUploadInput = {
        ...input,
        parentVideoId: resolvedParentId,
      };

      const result = await uploadVideo(uploadInput);

      if (result.success) {
        reset();
        // Dismiss back to feed — parent video is visible there with updated reply count
        router.back();
      } else {
        Alert.alert(
          'Upload Failed',
          result.error || 'Something went wrong. Try again.',
          [{ text: 'OK' }]
        );
      }
    },
    [resolvedParentId, uploadVideo, reset, router]
  );

  const handleCancel = useCallback(() => {
    if (selectedVideo || progress.stage !== 'idle') {
      Alert.alert(
        'Discard?',
        'Your response will be lost.',
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

  // Loading
  if (isLoadingParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#E8C547" />
          <Text style={styles.stateText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (loadError || !parentVideo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <View style={styles.errorCircle}>
            <Ionicons name="alert" size={24} color="#f87171" />
          </View>
          <Text style={styles.errorTitle}>Can't load video</Text>
          <Text style={styles.errorDesc}>
            {loadError || 'The video you want to respond to is unavailable.'}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerClose}
          onPress={handleCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-down" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Respond</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerRule} />

      <UploadForm
        selectedVideo={selectedVideo}
        thumbnailUri={thumbnailUri}
        progress={progress}
        parentVideoId={resolvedParentId}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#EDEDED',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  headerRule: {
    height: 1,
    backgroundColor: '#1E1E1E',
  },

  // Center states (loading / error)
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    letterSpacing: -0.2,
  },
  errorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(248,113,113,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EDEDED',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  errorDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    letterSpacing: -0.1,
  },
  backBtn: {
    backgroundColor: '#E8C547',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

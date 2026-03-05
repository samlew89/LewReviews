import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UploadForm } from '../../components/video/UploadForm';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { useHasResponded } from '../../hooks/useHasResponded';
import { VideoUploadInput, Video } from '../../types';
import { supabase } from '../../lib/supabase';

interface RouteParams {
  parentVideoId: string;
  agreeDisagree?: string;
  skipStance?: string;
}

export default function ResponseUploadModal() {
  const router = useRouter();
  const navigation = useNavigation();
  const hasUnsavedWorkRef = useRef(false);
  const params = useLocalSearchParams<RouteParams>();

  const rawParentVideoId = params.parentVideoId;
  const initialAgreeDisagree = params.agreeDisagree
    ? params.agreeDisagree === 'true'
    : undefined;

  const [parentVideo, setParentVideo] = useState<Video | null>(null);
  const [resolvedParentId, setResolvedParentId] = useState<string | undefined>(rawParentVideoId);
  const [isLoadingParent, setIsLoadingParent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const skipStance = params.skipStance === 'true';
  const { data: hasResponded } = useHasResponded(resolvedParentId);
  const isFollowUp = skipStance || (hasResponded === true && initialAgreeDisagree === undefined);

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

  const uploadSucceededRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Skip prompt if upload just succeeded or no unsaved work
      if (uploadSucceededRef.current || !hasUnsavedWorkRef.current) return;

      e.preventDefault();
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
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, reset]);

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
        uploadSucceededRef.current = true;
        hasUnsavedWorkRef.current = false;
        reset();
        // Dismiss modal — cache invalidation updates reply counts wherever we land
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
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [reset, router]);

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
        <Text style={styles.headerTitle}>{isFollowUp ? 'Reply' : 'Respond'}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.headerRule} />

      {isFollowUp && (
        <View style={styles.voteLocked}>
          <Ionicons name="lock-closed" size={14} color="#E8C547" />
          <Text style={styles.voteLockedText}>
            Your vote is locked from your first response. You can still add to the conversation.
          </Text>
        </View>
      )}

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
        submitButtonText={isFollowUp ? 'Post Reply' : 'Post Response'}
        showAgreeDisagree={!isFollowUp}
        hasUnsavedWorkRef={hasUnsavedWorkRef}
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
  voteLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.2)',
  },
  voteLockedText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 18,
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

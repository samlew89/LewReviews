import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { useHasResponded } from '../../hooks/useHasResponded';
import { VideoUploadInput, Video } from '../../types';
import { CONTENT_CONSTRAINTS } from '../../constants/config';
import { supabase } from '../../lib/supabase';

const ACCENT = '#FF2D55';
const AGREE_COLOR = '#34C759';

export default function ResponseUploadModal() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const hasUnsavedWorkRef = useRef(false);
  const uploadSucceededRef = useRef(false);

  const params = useLocalSearchParams<{ parentVideoId: string; agreeDisagree?: string; skipStance?: string }>();
  const rawParentVideoId = params.parentVideoId;
  const initialAgreeDisagree = params.agreeDisagree ? params.agreeDisagree === 'true' : undefined;
  const skipStance = params.skipStance === 'true';

  const [parentVideo, setParentVideo] = useState<Video | null>(null);
  const [resolvedParentId, setResolvedParentId] = useState<string | undefined>(rawParentVideoId);
  const [isLoadingParent, setIsLoadingParent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: respondedData } = useHasResponded(resolvedParentId);
  const hasResponded = respondedData?.hasResponded === true;
  const isFollowUp = skipStance || (hasResponded && initialAgreeDisagree === undefined);
  const lockedStance = respondedData?.originalStance;

  const [agreeDisagree, setAgreeDisagree] = useState<boolean | undefined>(initialAgreeDisagree);
  const [title, setTitle] = useState('');

  // Sync locked stance
  useEffect(() => {
    if (isFollowUp && lockedStance !== undefined) {
      setAgreeDisagree(lockedStance);
    }
  }, [isFollowUp, lockedStance]);

  // Sync initial agree/disagree
  useEffect(() => {
    if (initialAgreeDisagree !== undefined && agreeDisagree === undefined) {
      setAgreeDisagree(initialAgreeDisagree);
    }
  }, [initialAgreeDisagree, agreeDisagree]);

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

  // Record button pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const isUploading = ['uploading', 'creating_record', 'compressing', 'generating_thumbnail'].includes(progress.stage);

  // Discard guard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (uploadSucceededRef.current || !hasUnsavedWorkRef.current) return;
      e.preventDefault();
      Alert.alert('Discard changes?', 'You have unsaved work that will be lost.', [
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
      ]);
    });
    return unsubscribe;
  }, [navigation, reset]);

  // Fetch parent video
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
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setIsLoadingParent(false);
      }
    }
    fetchParentVideo();
  }, [rawParentVideoId]);

  // Track unsaved work
  useEffect(() => {
    hasUnsavedWorkRef.current = !!(selectedVideo || title.trim());
  }, [selectedVideo, title]);

  const handlePickFromGallery = useCallback(async () => {
    const video = await pickFromGallery();
    if (video) await generateThumbnail(video.uri);
  }, [pickFromGallery, generateThumbnail]);

  const handleRecordVideo = useCallback(async () => {
    const video = await recordVideo();
    if (video) await generateThumbnail(video.uri);
  }, [recordVideo, generateThumbnail]);

  const handlePost = useCallback(async () => {
    if (!selectedVideo) {
      Alert.alert('Record first', 'Record or choose a video before posting.');
      return;
    }
    if (!title.trim() || title.trim().length < CONTENT_CONSTRAINTS.TITLE_MIN_LENGTH) {
      Alert.alert('Add your take', 'Write a short caption for your response.');
      return;
    }
    if (!isFollowUp && agreeDisagree === undefined) {
      Alert.alert('Pick a side', 'Choose agree or disagree before posting.');
      return;
    }

    const input: VideoUploadInput = {
      title: title.trim(),
      parentVideoId: resolvedParentId,
      agreeDisagree,
    };

    const result = await uploadVideo(input);
    if (result.success) {
      uploadSucceededRef.current = true;
      hasUnsavedWorkRef.current = false;
      reset();
      router.back();
    } else {
      Alert.alert('Upload Failed', result.error || 'Something went wrong. Try again.');
    }
  }, [selectedVideo, title, isFollowUp, agreeDisagree, resolvedParentId, uploadVideo, reset, router]);

  const handleClose = useCallback(() => {
    if (hasUnsavedWorkRef.current) {
      Alert.alert('Discard changes?', 'You have unsaved work that will be lost.', [
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
      ]);
    } else {
      router.back();
    }
  }, [reset, router]);

  const canPost = selectedVideo && title.trim().length >= CONTENT_CONSTRAINTS.TITLE_MIN_LENGTH && (isFollowUp || agreeDisagree !== undefined) && !isUploading;

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── Loading state
  if (isLoadingParent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.stateText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // ── Error state
  if (loadError || !parentVideo) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerState}>
          <View style={styles.errorCircle}>
            <Ionicons name="alert" size={24} color="#f87171" />
          </View>
          <Text style={styles.errorTitle}>Can't load video</Text>
          <Text style={styles.errorDesc}>
            {loadError || 'The video you want to respond to is unavailable.'}
          </Text>
          <TouchableOpacity style={styles.errorBackBtn} onPress={() => router.back()}>
            <Text style={styles.errorBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Fetch parent username (we'll use a simplified approach)
  const parentUsername = parentVideo.title || 'Original review';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{isFollowUp ? 'Reply' : 'Reply'}</Text>
        <TouchableOpacity onPress={handlePost} disabled={!canPost} activeOpacity={0.7}>
          {isUploading ? (
            <ActivityIndicator color={ACCENT} size="small" />
          ) : (
            <Text style={[styles.postText, !canPost && styles.postTextDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Context Card (parent video info) ── */}
      <View style={styles.contextCard}>
        {parentVideo.thumbnail_url ? (
          <Image source={{ uri: parentVideo.thumbnail_url }} style={styles.contextThumb} />
        ) : (
          <View style={[styles.contextThumb, styles.contextThumbEmpty]}>
            <Ionicons name="film" size={18} color="rgba(255,255,255,0.2)" />
          </View>
        )}
        <View style={styles.contextInfo}>
          <Text style={styles.contextUser} numberOfLines={1}>Replying to review</Text>
          <Text style={styles.contextTitle} numberOfLines={1}>{parentVideo.title}</Text>
        </View>
      </View>

      {/* ── Stance Picker (segmented) ── */}
      {!isFollowUp && (
        <>
          <Text style={styles.stanceLabel}>Your Stance</Text>
          <View style={styles.stancePicker}>
            <TouchableOpacity
              style={[styles.stanceOption, agreeDisagree === true && styles.stanceAgreeActive]}
              onPress={() => setAgreeDisagree(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.stanceOptionText, agreeDisagree === true && styles.stanceAgreeText]}>
                Agree
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stanceOption, agreeDisagree === false && styles.stanceDisagreeActive]}
              onPress={() => setAgreeDisagree(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.stanceOptionText, agreeDisagree === false && styles.stanceDisagreeText]}>
                Disagree
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {isFollowUp && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.4)" />
          <Text style={styles.lockedText}>Stance locked from first response</Text>
        </View>
      )}

      {/* ── Caption Input ── */}
      <TextInput
        style={styles.captionInput}
        value={title}
        onChangeText={setTitle}
        placeholder="What's your response?"
        placeholderTextColor="rgba(255,255,255,0.2)"
        maxLength={CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH}
        editable={!isUploading}
        returnKeyType="done"
      />

      {/* ── Camera Viewfinder ── */}
      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.viewfinderImage} />
          ) : (
            <View style={styles.viewfinderEmpty}>
              <View style={styles.viewfinderIconWrap}>
                <Ionicons name="videocam" size={28} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={styles.viewfinderHint}>Record your response</Text>
            </View>
          )}
        </View>

        {/* Flip camera */}
        {!selectedVideo && (
          <TouchableOpacity style={styles.flipBtn} activeOpacity={0.7}>
            <Ionicons name="sync" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Duration hint */}
        {!selectedVideo && (
          <View style={styles.durationHint}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={styles.durationHintText}>Max 2 min</Text>
          </View>
        )}
      </View>

      {/* ── Record Controls ── */}
      <View style={[styles.recordArea, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={handlePickFromGallery}
          activeOpacity={0.7}
        >
          <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.sideLabel}>Gallery</Text>
        </TouchableOpacity>

        <View style={styles.recordCenter}>
          <TouchableOpacity
            style={styles.recordBtnOuter}
            onPress={selectedVideo ? handlePost : handleRecordVideo}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.recordRing, { transform: [{ scale: selectedVideo ? 1 : pulseAnim }] }]} />
            <View style={[styles.recordBtnInner, selectedVideo && styles.recordBtnReady]} />
          </TouchableOpacity>
          <Text style={styles.timerText}>
            {selectedVideo ? fmt(selectedVideo.duration) + ' / 2:00' : '0:00 / 2:00'}
          </Text>
        </View>

        <TouchableOpacity style={styles.sideBtn} activeOpacity={0.7}>
          <Ionicons name="sparkles" size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.sideLabel}>Effects</Text>
        </TouchableOpacity>
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Center states
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
    color: '#fff',
    marginBottom: 6,
  },
  errorDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  errorBackBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  errorBackBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  postText: {
    fontSize: 17,
    fontWeight: '700',
    color: ACCENT,
  },
  postTextDisabled: {
    opacity: 0.3,
  },

  // ── Context Card
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  contextThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  contextThumbEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextInfo: {
    flex: 1,
    gap: 2,
  },
  contextUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  contextTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Stance Picker
  stanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  stancePicker: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 3,
  },
  stanceOption: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stanceAgreeActive: {
    backgroundColor: AGREE_COLOR,
  },
  stanceDisagreeActive: {
    backgroundColor: '#FF3B30',
  },
  stanceOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  stanceAgreeText: {
    color: '#fff',
    fontWeight: '700',
  },
  stanceDisagreeText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Locked banner
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
  },
  lockedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Caption
  captionInput: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    letterSpacing: -0.2,
  },

  // ── Viewfinder
  viewfinderWrap: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  viewfinder: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  viewfinderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewfinderEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  viewfinderIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  flipBtn: {
    position: 'absolute',
    top: 8,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationHint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationHintText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Record Controls
  recordArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  recordCenter: {
    alignItems: 'center',
    gap: 6,
  },
  recordBtnOuter: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  recordBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
  },
  recordBtnReady: {
    backgroundColor: AGREE_COLOR,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    fontVariant: ['tabular-nums'],
  },

  // Progress
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
  },
});

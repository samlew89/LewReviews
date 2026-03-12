import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadInput, VideoRating, RATING_LABELS, RATING_EMOJIS, TmdbSearchResult } from '../../types';
import { CONTENT_CONSTRAINTS } from '../../constants/config';
import MovieSearchSheet from '../../components/MovieSearchSheet';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 72 : 62;
const ACCENT = '#FF2D55';
const RATING_OPTIONS: VideoRating[] = [1, 2, 3, 4, 5];
const { width: SCREEN_W } = Dimensions.get('window');
const VIEWFINDER_W = SCREEN_W - 32;
const VIEWFINDER_H = VIEWFINDER_W * 1.1;

export default function CreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const hasUnsavedWorkRef = useRef(false);

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

  const [rating, setRating] = useState<VideoRating | undefined>(undefined);
  const [movieTitle, setMovieTitle] = useState('');
  const [selectedTmdbResult, setSelectedTmdbResult] = useState<TmdbSearchResult | null>(null);
  const [movieSheetVisible, setMovieSheetVisible] = useState(false);
  const [title, setTitle] = useState('');

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

  // Clear on tab blur
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      hasUnsavedWorkRef.current = false;
      reset();
      setRating(undefined);
      setMovieTitle('');
      setSelectedTmdbResult(null);
      setTitle('');
    });
    return unsubscribe;
  }, [navigation, reset]);

  // Track unsaved work
  useEffect(() => {
    hasUnsavedWorkRef.current = !!(selectedVideo || title.trim() || movieTitle.trim());
  }, [selectedVideo, title, movieTitle]);

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
      Alert.alert('Add your take', 'Write a short caption for your review.');
      return;
    }
    if (rating === undefined) {
      Alert.alert('Rate it', 'Pick a rating before posting your review.');
      return;
    }
    if (!movieTitle.trim()) {
      Alert.alert('What movie?', 'Tag the movie or show you\'re reviewing.');
      return;
    }

    const input: VideoUploadInput = {
      title: title.trim(),
      rating,
      movieTitle: movieTitle.trim(),
      tmdbId: selectedTmdbResult?.id,
      tmdbMediaType: selectedTmdbResult?.media_type,
      tmdbPosterPath: selectedTmdbResult?.poster_path ?? undefined,
    };

    const result = await uploadVideo(input);
    if (result.success) {
      hasUnsavedWorkRef.current = false;
      reset();
      setRating(undefined);
      setMovieTitle('');
      setSelectedTmdbResult(null);
      setTitle('');
      router.replace('/(tabs)/feed');
    } else {
      Alert.alert('Upload Failed', result.error || 'Something went wrong. Try again.');
    }
  }, [selectedVideo, title, rating, movieTitle, selectedTmdbResult, uploadVideo, reset, router]);

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
            setRating(undefined);
            setMovieTitle('');
            setSelectedTmdbResult(null);
            setTitle('');
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  }, [reset, router]);

  const handleMovieSelect = useCallback((result: TmdbSearchResult | null, name: string) => {
    setSelectedTmdbResult(result);
    setMovieTitle(name);
  }, []);

  const canPost = selectedVideo && title.trim().length >= CONTENT_CONSTRAINTS.TITLE_MIN_LENGTH && rating !== undefined && movieTitle.trim() && !isUploading;

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>New Review</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Camera Viewfinder ── */}
      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.viewfinderImage} />
          ) : (
            <View style={styles.viewfinderEmpty}>
              <View style={styles.viewfinderIconWrap}>
                <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={styles.viewfinderHint}>Tap record or choose from gallery</Text>
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.viewfinderGradient} />
        </View>

        {/* Duration hint pill */}
        {!selectedVideo && (
          <View style={styles.durationHint}>
            <Ionicons name="timer-outline" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.durationHintText}>Max 2 min</Text>
          </View>
        )}

        {/* Flip camera overlay */}
        {!selectedVideo && (
          <TouchableOpacity style={styles.flipBtn} activeOpacity={0.7}>
            <Ionicons name="sync" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bottom Controls ── */}
      <ScrollView
        style={styles.bottomControls}
        contentContainerStyle={[styles.bottomControlsInner, { paddingBottom: TAB_BAR_HEIGHT + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Caption input */}
        <TextInput
          style={styles.captionInput}
          value={title}
          onChangeText={setTitle}
          placeholder="What's your hot take?"
          placeholderTextColor="rgba(255,255,255,0.2)"
          maxLength={CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH}
          editable={!isUploading}
          returnKeyType="done"
        />

        {/* Movie tag card */}
        <TouchableOpacity
          style={[styles.movieTag, selectedTmdbResult && styles.movieTagSelected]}
          onPress={() => setMovieSheetVisible(true)}
          activeOpacity={0.7}
        >
          {selectedTmdbResult?.poster_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w92${selectedTmdbResult.poster_path}` }}
              style={styles.movieThumb}
            />
          ) : (
            <View style={[styles.movieThumb, styles.movieThumbEmpty]}>
              <Ionicons name="film" size={14} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          <View style={styles.movieInfo}>
            <Text style={styles.movieName} numberOfLines={1}>
              {movieTitle || 'Tag a movie or show'}
            </Text>
            {selectedTmdbResult && (
              <Text style={styles.movieMeta} numberOfLines={1}>
                {selectedTmdbResult.year} · {selectedTmdbResult.media_type === 'tv' ? 'TV Show' : 'Movie'}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        {/* Your Rating label */}
        <Text style={styles.ratingLabel}>Your Rating</Text>

        {/* Rating pills row */}
        <View style={styles.ratingRow}>
          {RATING_OPTIONS.map((r) => {
            const isSelected = rating === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.ratingChip, isSelected && styles.ratingChipActive]}
                onPress={() => setRating(r)}
                activeOpacity={0.7}
              >
                <Text style={styles.ratingEmoji}>{RATING_EMOJIS[r]}</Text>
                <Text style={[styles.ratingChipText, isSelected && styles.ratingChipTextActive]}>
                  {RATING_LABELS[r]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Record button area */}
        <View style={styles.recordArea}>
          <TouchableOpacity
            style={styles.galleryBtn}
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
              <View style={[styles.recordBtnInner, selectedVideo && styles.recordBtnInnerReady]} />
            </TouchableOpacity>
            <Text style={styles.timerText}>
              {selectedVideo ? fmt(selectedVideo.duration) + ' / 2:00' : '0:00 / 2:00'}
            </Text>
          </View>

          <TouchableOpacity style={styles.effectsBtn} activeOpacity={0.7}>
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
      </ScrollView>

      {/* Movie search sheet */}
      <MovieSearchSheet
        visible={movieSheetVisible}
        onClose={() => setMovieSheetVisible(false)}
        onSelect={(result, name) => {
          handleMovieSelect(result, name);
          setMovieSheetVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 52,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  postBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: 'rgba(255,45,85,0.3)',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  postBtnTextDisabled: {
    opacity: 0.5,
  },

  // ── Viewfinder
  viewfinderWrap: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewfinder: {
    width: '100%',
    height: VIEWFINDER_H,
    maxHeight: 420,
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
    gap: 12,
  },
  viewfinderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: -0.2,
  },
  viewfinderGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    // Simulated gradient with opacity
    backgroundColor: 'transparent',
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
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
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

  // ── Bottom Controls
  bottomControls: {
    flex: 1,
  },
  bottomControlsInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // Caption
  captionInput: {
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

  // Movie tag
  movieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  movieTagSelected: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  movieThumb: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  movieThumbEmpty: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    flex: 1,
    gap: 1,
  },
  movieName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  movieMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Rating
  ratingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ratingChipActive: {
    backgroundColor: 'rgba(232,197,71,0.2)',
    borderColor: 'rgba(232,197,71,0.4)',
    borderWidth: 1.5,
  },
  ratingEmoji: {
    fontSize: 12,
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  ratingChipTextActive: {
    color: '#e8c547',
    fontWeight: '700',
  },

  // Record area
  recordArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  galleryBtn: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  effectsBtn: {
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
  recordBtnInnerReady: {
    backgroundColor: '#34C759',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    fontVariant: ['tabular-nums'],
  },

  // Progress
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
});

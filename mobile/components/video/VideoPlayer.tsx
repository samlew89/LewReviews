// ============================================================================
// LewReviews Mobile - VideoPlayer Component
// Wrapper around expo-video's VideoView with play/pause, progress, and mute
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayerStatus } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 72;

// Global mute state — persists across all VideoPlayer instances
let globalMuted = false;

export function toggleGlobalMute(): boolean {
  globalMuted = !globalMuted;
  return globalMuted;
}

export function getGlobalMuted(): boolean {
  return globalMuted;
}

// Global progress state — shared across players for floating tab bar stroke
let globalProgress = 0;
const progressListeners = new Set<(value: number) => void>();

export function getGlobalProgress(): number {
  return globalProgress;
}

export function onProgressChange(cb: (value: number) => void): () => void {
  progressListeners.add(cb);
  return () => progressListeners.delete(cb);
}

export function setGlobalProgress(v: number): void {
  globalProgress = v;
  progressListeners.forEach((cb) => cb(v));
}

interface VideoPlayerProps {
  videoUrl: string;
  isActive: boolean;
  isShareSheetOpen?: boolean;
  hideProgressBar?: boolean;
  onVideoEnd?: () => void;
  onError?: (error: Error) => void;
  onRegisterToggle?: (toggle: () => void) => void;
}

export default function VideoPlayer({
  videoUrl,
  isActive,
  isShareSheetOpen = false,
  hideProgressBar = false,
  onVideoEnd,
  onError,
  onRegisterToggle,
}: VideoPlayerProps) {
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [lastAction, setLastAction] = useState<'pause' | 'play'>('play');
  const [isBuffering, setIsBuffering] = useState(false);

  const bottomOffset = TAB_BAR_HEIGHT;

  // shouldPlayRef tracks the DESIRED state: true = should be playing
  const shouldPlayRef = useRef(isActive);
  const wasPlayingBeforeShare = useRef(false);
  const shareSheetOpenRef = useRef(isShareSheetOpen);

  // Animated values
  const playIconOpacity = useSharedValue(0);
  const playIconScale = useSharedValue(0.5);
  const progressValue = useSharedValue(0);

  // Create video player instance — only auto-play if active to avoid
  // multiple players competing for playback during FlatList initial render
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = globalMuted;
    if (isActive) {
      p.play();
    }
  });


  // Handle player status changes
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (payload) => {
      const status = payload.status ?? payload;
      if (status === 'readyToPlay') {
        setIsBuffering(false);
        if (shouldPlayRef.current && !player.playing) {
          player.play();
        }
      } else if (status === 'loading') {
        setIsBuffering(true);
      } else if (status === 'error') {
        setIsBuffering(false);
        onError?.(new Error('Video playback error'));
      }
    });

    const playingSub = player.addListener('playingChange', (payload) => {
      const isPlaying = typeof payload === 'boolean' ? payload : payload.isPlaying;
      if (isPlaying) {
        setIsBuffering(false);
      } else if (player.currentTime >= player.duration - 0.1) {
        onVideoEnd?.();
      }
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [player, onVideoEnd, onError]);

  // Control playback when isActive changes
  useEffect(() => {
    if (!player) return;
    shouldPlayRef.current = isActive;

    if (isActive) {
      player.play();
      player.muted = globalMuted;
    } else {
      player.pause();
      progressValue.value = 0;
    }
  }, [player, isActive, progressValue]);

  // Polling: progress bar, mute sync, autoplay retry
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      if (player.muted !== globalMuted) {
        player.muted = globalMuted;
      }
      if (shouldPlayRef.current && !player.playing) {
        player.play();
      }
      if (player.playing && player.duration > 0) {
        const progress = player.currentTime / player.duration;
        progressValue.value = progress;
        setGlobalProgress(progress);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, progressValue]);

  // Resume playback when app returns from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!player) return;
      if (nextState === 'active' && shouldPlayRef.current) {
        player.muted = globalMuted;
        player.play();
      }
    });

    return () => subscription.remove();
  }, [player]);

  // Share sheet handling — only act on close transitions (was open → now closed)
  const prevShareSheetOpen = useRef(false);
  useEffect(() => {
    const wasOpen = prevShareSheetOpen.current;
    prevShareSheetOpen.current = isShareSheetOpen;
    shareSheetOpenRef.current = isShareSheetOpen;
    if (!player) return;

    if (isShareSheetOpen) {
      wasPlayingBeforeShare.current = player.playing;
    } else if (wasOpen) {
      // Only restore state when share sheet actually just closed
      const timeout = setTimeout(() => {
        if (isActive && wasPlayingBeforeShare.current) {
          shouldPlayRef.current = true;
          player.play();
        } else if (isActive && !wasPlayingBeforeShare.current) {
          shouldPlayRef.current = false;
          player.pause();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [player, isShareSheetOpen, isActive]);

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
    transform: [{ scale: playIconScale.value }],
  }));

  const flashPlayIcon = useCallback(() => {
    setShowPlayIcon(true);
    playIconOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 500 }, () => {
        runOnJS(setShowPlayIcon)(false);
      })
    );
    playIconScale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
  }, [playIconOpacity, playIconScale]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!player) return;
    if (shareSheetOpenRef.current) return;

    if (player.playing) {
      shouldPlayRef.current = false;
      setLastAction('pause');
      player.pause();
    } else {
      shouldPlayRef.current = true;
      setLastAction('play');
      player.play();
    }
    flashPlayIcon();
  }, [player, flashPlayIcon]);

  // Register toggle function with parent (re-registers when player reference changes)
  useEffect(() => {
    if (onRegisterToggle) {
      onRegisterToggle(togglePlayPause);
    }
  }, [onRegisterToggle, togglePlayPause]);

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />

        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {showPlayIcon && (
          <Animated.View style={[styles.playIconContainer, playIconAnimatedStyle]}>
            <Ionicons
              name={lastAction === 'pause' ? 'pause' : 'play'}
              size={80}
              color="rgba(255, 255, 255, 0.8)"
            />
          </Animated.View>
        )}
      </View>

      {/* Progress indicator moved to floating tab bar perimeter stroke */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
});

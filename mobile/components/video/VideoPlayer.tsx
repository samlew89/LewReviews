// ============================================================================
// LewReviews Mobile - VideoPlayer Component
// Wrapper around expo-video's VideoView with play/pause, progress, and mute
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayerStatus } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;

interface VideoPlayerProps {
  videoUrl: string;
  isActive: boolean; // Whether this video should be playing (visible in viewport)
  isShareSheetOpen?: boolean; // Whether the share sheet is currently open
  onVideoEnd?: () => void;
  onError?: (error: Error) => void;
}

export default function VideoPlayer({
  videoUrl,
  isActive,
  isShareSheetOpen = false,
  onVideoEnd,
  onError,
}: VideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const bottomOffset = TAB_BAR_HEIGHT;

  // Track the user's intended play state (not affected by share sheet)
  const wasPlayingBeforeShare = useRef(false);
  // Ref mirror of isShareSheetOpen so handleTap can read it without re-creating
  const shareSheetOpenRef = useRef(isShareSheetOpen);

  // Animated values
  const playIconOpacity = useSharedValue(0);
  const playIconScale = useSharedValue(0.5);
  const progressValue = useSharedValue(0);

  // Create video player instance
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.muted = isMuted;
  });

  // Start a linear animation from current position to end over remaining time
  const startProgressAnimation = useCallback(() => {
    if (!player || player.duration <= 0 || !player.playing) return;
    cancelAnimation(progressValue);
    const current = player.currentTime / player.duration;
    const remainingMs = (player.duration - player.currentTime) * 1000;
    progressValue.value = current;
    progressValue.value = withTiming(1, {
      duration: remainingMs,
      easing: Easing.linear,
    });
  }, [player, progressValue]);

  // Handle player status changes + drive progress animation from events
  useEffect(() => {
    if (!player) return;

    const statusSubscription = player.addListener('statusChange', (status: VideoPlayerStatus) => {
      if (status === 'readyToPlay') {
        setIsBuffering(false);
        if (player.playing) {
          startProgressAnimation();
        }
      } else if (status === 'loading') {
        setIsBuffering(true);
      } else if (status === 'error') {
        setIsBuffering(false);
        onError?.(new Error('Video playback error'));
      }
    });

    const playingSubscription = player.addListener('playingChange', (isPlaying: boolean) => {
      if (isPlaying) {
        setIsBuffering(false);
        startProgressAnimation();
      } else {
        // Paused — freeze the bar at the current position
        cancelAnimation(progressValue);
        if (player.duration > 0) {
          progressValue.value = player.currentTime / player.duration;
        }
        if (player.currentTime >= player.duration - 0.1) {
          onVideoEnd?.();
        }
      }
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player, onVideoEnd, onError, progressValue, startProgressAnimation]);

  // Handle loop reset — detect when currentTime jumps back near 0
  useEffect(() => {
    if (!player || !isActive) return;

    const interval = setInterval(() => {
      if (player.duration > 0 && player.playing) {
        const current = player.currentTime / player.duration;
        // Loop detected: bar is near end but player jumped back to start
        if (progressValue.value > 0.95 && current < 0.05) {
          progressValue.value = 0;
          startProgressAnimation();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [player, isActive, progressValue, startProgressAnimation]);

  // Control playback based on isActive
  useEffect(() => {
    if (!player) return;

    if (isActive) {
      player.play();
    } else {
      player.pause();
      cancelAnimation(progressValue);
      progressValue.value = 0;
    }
  }, [player, isActive, progressValue]);

  // Preserve playback state across share sheet open/close
  useEffect(() => {
    shareSheetOpenRef.current = isShareSheetOpen;

    if (!player) return;

    if (isShareSheetOpen) {
      // Save current playing state before the share sheet potentially pauses the video
      wasPlayingBeforeShare.current = player.playing;
    } else {
      // Restore the playback state the user had before the share sheet opened
      const timeout = setTimeout(() => {
        if (isActive && wasPlayingBeforeShare.current) {
          player.play();
        } else if (isActive && !wasPlayingBeforeShare.current) {
          player.pause();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [player, isShareSheetOpen, isActive]);

  // Update muted state
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);

  // Animated progress bar — runs on UI thread, no JS re-renders
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  // Animated play icon style
  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
    transform: [{ scale: playIconScale.value }],
  }));

  // Show play/pause icon briefly
  const flashPlayIcon = useCallback((isPaused: boolean) => {
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

  // Handle tap to play/pause
  const handleTap = useCallback(() => {
    if (!player) return;

    // Ignore taps while the share sheet is open (dismiss tap leaks through)
    if (shareSheetOpenRef.current) return;

    if (player.playing) {
      player.pause();
      flashPlayIcon(true);
    } else {
      player.play();
      flashPlayIcon(false);
    }
  }, [player, flashPlayIcon]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />

          {/* Buffering indicator */}
          {isBuffering && (
            <View style={styles.bufferingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {/* Play/Pause icon overlay */}
          {showPlayIcon && (
            <Animated.View style={[styles.playIconContainer, playIconAnimatedStyle]}>
              <Ionicons
                name={player?.playing ? 'pause' : 'play'}
                size={80}
                color="rgba(255, 255, 255, 0.8)"
              />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Progress bar */}
      <View style={[styles.progressContainer, { bottom: bottomOffset }]}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      {/* Mute toggle button */}
      <TouchableWithoutFeedback onPress={handleMuteToggle}>
        <View style={styles.muteButton}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={24}
            color="#fff"
          />
        </View>
      </TouchableWithoutFeedback>
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  muteButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

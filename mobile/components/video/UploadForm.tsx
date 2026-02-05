// ============================================================================
// LewReviews Mobile - Upload Form Component
// ============================================================================
// Displays video preview, title/description inputs, upload progress,
// and error handling for video uploads.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { VideoMetadata, UploadProgress, VideoUploadInput } from '../../types';
import { CONTENT_CONSTRAINTS } from '../../constants/config';

// ============================================================================
// Types
// ============================================================================

interface UploadFormProps {
  // Video data
  selectedVideo: VideoMetadata | null;
  thumbnailUri: string | null;
  progress: UploadProgress;

  // Response video props (optional)
  parentVideoId?: string;
  parentVideoTitle?: string;
  agreeDisagree?: boolean;

  // Actions
  onPickFromGallery: () => Promise<void>;
  onRecordVideo: () => Promise<void>;
  onUpload: (input: VideoUploadInput) => Promise<void>;
  onCancel: () => void;

  // UI customization
  submitButtonText?: string;
  showAgreeDisagree?: boolean;
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number;
  stage: UploadProgress['stage'];
  message: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, stage, message }) => {
  const isActive = stage !== 'idle' && stage !== 'error' && stage !== 'complete';

  if (!isActive && stage !== 'complete') {
    return null;
  }

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%` },
            stage === 'complete' && styles.progressBarComplete,
            stage === 'error' && styles.progressBarError,
          ]}
        />
      </View>
      <Text style={styles.progressText}>{message}</Text>
    </View>
  );
};

// ============================================================================
// Error Display Component
// ============================================================================

interface ErrorDisplayProps {
  error: string;
  onDismiss: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>!</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.errorDismiss}>
        <Text style={styles.errorDismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// Video Preview Component
// ============================================================================

interface VideoPreviewProps {
  videoUri: string;
  thumbnailUri: string | null;
  duration: number;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoUri, thumbnailUri, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.previewContainer}>
      {isPlaying ? (
        <Video
          source={{ uri: videoUri }}
          style={styles.videoPreview}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
            }
          }}
        />
      ) : (
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={() => setIsPlaying(true)}
        >
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Text style={styles.placeholderText}>No Preview</Text>
            </View>
          )}
          <View style={styles.playButtonOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>Play</Text>
            </View>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================================================
// Main Upload Form Component
// ============================================================================

export const UploadForm: React.FC<UploadFormProps> = ({
  selectedVideo,
  thumbnailUri,
  progress,
  parentVideoId,
  parentVideoTitle,
  agreeDisagree: initialAgreeDisagree,
  onPickFromGallery,
  onRecordVideo,
  onUpload,
  onCancel,
  submitButtonText = 'Upload Video',
  showAgreeDisagree = false,
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agreeDisagree, setAgreeDisagree] = useState<boolean | undefined>(initialAgreeDisagree);
  const [showError, setShowError] = useState(true);

  // Derived state
  const isUploading = ['uploading', 'creating_record', 'compressing', 'generating_thumbnail'].includes(
    progress.stage
  );
  const isComplete = progress.stage === 'complete';
  const hasError = progress.stage === 'error' && showError;
  const canSubmit = selectedVideo && title.trim().length >= CONTENT_CONSTRAINTS.TITLE_MIN_LENGTH && !isUploading;

  // Character counts
  const titleCharsRemaining = CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH - title.length;
  const descriptionCharsRemaining = CONTENT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH - description.length;

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    // Validate agree/disagree for response videos
    if (showAgreeDisagree && agreeDisagree === undefined) {
      Alert.alert('Selection Required', 'Please select whether you agree or disagree');
      return;
    }

    const input: VideoUploadInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      parentVideoId,
      agreeDisagree,
    };

    await onUpload(input);
  }, [canSubmit, title, description, parentVideoId, agreeDisagree, showAgreeDisagree, onUpload]);

  /**
   * Handle gallery selection
   */
  const handlePickFromGallery = useCallback(async () => {
    setShowError(true);
    await onPickFromGallery();
  }, [onPickFromGallery]);

  /**
   * Handle camera recording
   */
  const handleRecordVideo = useCallback(async () => {
    setShowError(true);
    await onRecordVideo();
  }, [onRecordVideo]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error Display */}
        {hasError && progress.error && (
          <ErrorDisplay
            error={progress.error}
            onDismiss={() => setShowError(false)}
          />
        )}

        {/* Stance Selection - Hero section for responses */}
        {showAgreeDisagree && (
          <View style={styles.stanceSection}>
            <Text style={styles.stanceHeader}>Take your side</Text>
            {parentVideoTitle && (
              <Text style={styles.stanceSubheader} numberOfLines={1}>
                on "{parentVideoTitle}"
              </Text>
            )}
            <View style={styles.stanceCards}>
              <TouchableOpacity
                style={[
                  styles.stanceCard,
                  agreeDisagree === true && styles.stanceCardSelected,
                ]}
                onPress={() => setAgreeDisagree(true)}
                disabled={isUploading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={agreeDisagree === true ? ['#22c55e', '#16a34a'] : ['#1a1a1a', '#151515']}
                  style={styles.stanceCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[
                    styles.stanceIconCircle,
                    agreeDisagree === true && styles.stanceIconCircleAgree
                  ]}>
                    <Ionicons
                      name="checkmark"
                      size={28}
                      color={agreeDisagree === true ? '#22c55e' : '#22c55e'}
                    />
                  </View>
                  <Text style={[
                    styles.stanceCardTitle,
                    agreeDisagree !== true && styles.stanceCardTitleUnselected
                  ]}>
                    Agree
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stanceCard,
                  agreeDisagree === false && styles.stanceCardSelected,
                ]}
                onPress={() => setAgreeDisagree(false)}
                disabled={isUploading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={agreeDisagree === false ? ['#ef4444', '#dc2626'] : ['#1a1a1a', '#151515']}
                  style={styles.stanceCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[
                    styles.stanceIconCircle,
                    agreeDisagree === false && styles.stanceIconCircleDisagree
                  ]}>
                    <Ionicons
                      name="close"
                      size={28}
                      color={agreeDisagree === false ? '#ef4444' : '#ef4444'}
                    />
                  </View>
                  <Text style={[
                    styles.stanceCardTitle,
                    agreeDisagree !== false && styles.stanceCardTitleUnselected
                  ]}>
                    Disagree
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Video Selection / Preview */}
        {selectedVideo ? (
          <VideoPreview
            videoUri={selectedVideo.uri}
            thumbnailUri={thumbnailUri}
            duration={selectedVideo.duration}
          />
        ) : (
          <View style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>
              {showAgreeDisagree ? 'Now record your response' : 'Record your take'}
            </Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleRecordVideo}
                disabled={isUploading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#ff2d55', '#ff0844']}
                  style={styles.recordButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.recordButtonInner}>
                    <Ionicons name="videocam" size={28} color="#fff" />
                  </View>
                  <Text style={styles.recordButtonText}>Record</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
                disabled={isUploading}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={20} color="#888" />
                <Text style={styles.galleryButtonText}>or choose from gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Change Video Button */}
        {selectedVideo && !isUploading && (
          <TouchableOpacity
            style={styles.changeVideoButton}
            onPress={handlePickFromGallery}
          >
            <Text style={styles.changeVideoText}>Change video</Text>
          </TouchableOpacity>
        )}

        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Give your video a title..."
            placeholderTextColor="#999"
            maxLength={CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH}
            editable={!isUploading}
          />
          <Text style={[styles.charCount, titleCharsRemaining < 20 && styles.charCountWarning]}>
            {titleCharsRemaining} characters remaining
          </Text>
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description..."
            placeholderTextColor="#999"
            maxLength={CONTENT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isUploading}
          />
          <Text
            style={[styles.charCount, descriptionCharsRemaining < 100 && styles.charCountWarning]}
          >
            {descriptionCharsRemaining} characters remaining
          </Text>
        </View>

        {/* Progress Bar */}
        <ProgressBar
          progress={progress.progress}
          stage={progress.stage}
          message={progress.message}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isUploading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isComplete ? 'Uploaded!' : submitButtonText}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Stance Selection Cards
  stanceSection: {
    marginBottom: 28,
  },
  stanceHeader: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  stanceSubheader: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  stanceCards: {
    flexDirection: 'row',
    gap: 12,
  },
  stanceCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
  },
  stanceCardSelected: {
    borderColor: 'transparent',
  },
  stanceCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stanceIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stanceIconCircleAgree: {
    backgroundColor: '#fff',
  },
  stanceIconCircleDisagree: {
    backgroundColor: '#fff',
  },
  stanceCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stanceCardTitleUnselected: {
    color: '#888',
  },

  // Error Display
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginRight: 10,
    width: 28,
    height: 28,
    textAlign: 'center',
    lineHeight: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  errorDismiss: {
    padding: 6,
  },
  errorDismissText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },

  // Video Selection
  selectionContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginBottom: 20,
  },
  selectionButtons: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  recordButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#ff2d55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  recordButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  galleryButtonText: {
    fontSize: 14,
    color: '#888',
  },

  // Video Preview
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#111',
    aspectRatio: 9 / 16,
    maxHeight: 380,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Change Video Button
  changeVideoButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  changeVideoText: {
    color: '#ff2d55',
    fontSize: 15,
    fontWeight: '600',
  },

  // Input Fields
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 6,
  },
  charCountWarning: {
    color: '#f59e0b',
  },

  // Progress Bar
  progressContainer: {
    marginVertical: 20,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff2d55',
    borderRadius: 3,
  },
  progressBarComplete: {
    backgroundColor: '#22c55e',
  },
  progressBarError: {
    backgroundColor: '#ef4444',
  },
  progressText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ff2d55',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#4a1525',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default UploadForm;

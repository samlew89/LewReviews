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
        {/* Response Header */}
        {parentVideoId && parentVideoTitle && (
          <View style={styles.responseHeader}>
            <Text style={styles.responseLabel}>Responding to:</Text>
            <Text style={styles.responseTitle} numberOfLines={2}>
              {parentVideoTitle}
            </Text>
          </View>
        )}

        {/* Error Display */}
        {hasError && progress.error && (
          <ErrorDisplay
            error={progress.error}
            onDismiss={() => setShowError(false)}
          />
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
            <View style={styles.selectionIconWrapper}>
              <Ionicons name="videocam" size={48} color="#666" />
            </View>
            <Text style={styles.selectionTitle}>Add your video</Text>
            <Text style={styles.selectionSubtitle}>Record a new video or choose from your gallery</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={styles.selectionButton}
                onPress={handleRecordVideo}
                disabled={isUploading}
              >
                <View style={styles.selectionButtonIconWrapper}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
                <Text style={styles.selectionButtonText}>Record</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionButton, styles.selectionButtonOutline]}
                onPress={handlePickFromGallery}
                disabled={isUploading}
              >
                <View style={[styles.selectionButtonIconWrapper, styles.selectionButtonIconOutline]}>
                  <Ionicons name="images" size={24} color="#fff" />
                </View>
                <Text style={styles.selectionButtonText}>Gallery</Text>
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
            <Text style={styles.changeVideoText}>Change Video</Text>
          </TouchableOpacity>
        )}

        {/* Agree/Disagree Selection (for responses) */}
        {showAgreeDisagree && (
          <View style={styles.agreeDisagreeContainer}>
            <Text style={styles.inputLabel}>Your stance</Text>
            <View style={styles.agreeDisagreeButtons}>
              <TouchableOpacity
                style={[
                  styles.agreeDisagreeButton,
                  agreeDisagree === true && styles.agreeButtonSelected,
                ]}
                onPress={() => setAgreeDisagree(true)}
                disabled={isUploading}
              >
                <Ionicons
                  name={agreeDisagree === true ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={22}
                  color={agreeDisagree === true ? '#22c55e' : '#888'}
                />
                <Text
                  style={[
                    styles.agreeDisagreeText,
                    agreeDisagree === true && styles.agreeTextSelected,
                  ]}
                >
                  Agree
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.agreeDisagreeButton,
                  agreeDisagree === false && styles.disagreeButtonSelected,
                ]}
                onPress={() => setAgreeDisagree(false)}
                disabled={isUploading}
              >
                <Ionicons
                  name={agreeDisagree === false ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={22}
                  color={agreeDisagree === false ? '#ef4444' : '#888'}
                />
                <Text
                  style={[
                    styles.agreeDisagreeText,
                    agreeDisagree === false && styles.disagreeTextSelected,
                  ]}
                >
                  Disagree
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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

  // Response Header
  responseHeader: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  responseLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  responseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectionIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  selectionSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionButton: {
    alignItems: 'center',
    gap: 8,
  },
  selectionButtonOutline: {},
  selectionButtonIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionButtonIconOutline: {
    backgroundColor: '#333',
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

  // Agree/Disagree
  agreeDisagreeContainer: {
    marginBottom: 20,
  },
  agreeDisagreeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  agreeDisagreeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  agreeButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  disagreeButtonSelected: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  agreeDisagreeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  agreeTextSelected: {
    color: '#22c55e',
  },
  disagreeTextSelected: {
    color: '#ef4444',
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

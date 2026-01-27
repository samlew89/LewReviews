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
            <Text style={styles.selectionTitle}>Select a Video</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={styles.selectionButton}
                onPress={handlePickFromGallery}
                disabled={isUploading}
              >
                <Text style={styles.selectionButtonIcon}>Gallery</Text>
                <Text style={styles.selectionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.selectionButton}
                onPress={handleRecordVideo}
                disabled={isUploading}
              >
                <Text style={styles.selectionButtonIcon}>Camera</Text>
                <Text style={styles.selectionButtonText}>Record Video</Text>
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
            <Text style={styles.inputLabel}>Your Position</Text>
            <View style={styles.agreeDisagreeButtons}>
              <TouchableOpacity
                style={[
                  styles.agreeDisagreeButton,
                  agreeDisagree === true && styles.agreeButtonSelected,
                ]}
                onPress={() => setAgreeDisagree(true)}
                disabled={isUploading}
              >
                <Text
                  style={[
                    styles.agreeDisagreeText,
                    agreeDisagree === true && styles.agreeDisagreeTextSelected,
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
                <Text
                  style={[
                    styles.agreeDisagreeText,
                    agreeDisagree === false && styles.agreeDisagreeTextSelected,
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  responseLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Error Display
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginRight: 8,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#fecaca',
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
  },
  errorDismiss: {
    padding: 4,
  },
  errorDismissText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },

  // Video Selection
  selectionContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionButtonIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 8,
  },
  selectionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Video Preview
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#000',
    aspectRatio: 9 / 16,
    maxHeight: 400,
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
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Change Video Button
  changeVideoButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  changeVideoText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },

  // Agree/Disagree
  agreeDisagreeContainer: {
    marginBottom: 16,
  },
  agreeDisagreeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  agreeDisagreeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  agreeButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  disagreeButtonSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  agreeDisagreeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  agreeDisagreeTextSelected: {
    color: '#374151',
  },

  // Input Fields
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: '#f59e0b',
  },

  // Progress Bar
  progressContainer: {
    marginVertical: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressBarComplete: {
    backgroundColor: '#22c55e',
  },
  progressBarError: {
    backgroundColor: '#ef4444',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default UploadForm;

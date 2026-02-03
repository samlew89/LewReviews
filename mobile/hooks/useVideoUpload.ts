// ============================================================================
// LewReviews Mobile - Video Upload Hook
// ============================================================================
// Handles video picking, recording, duration extraction, compression,
// thumbnail generation, and Supabase upload with progress tracking.
// ============================================================================

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Audio } from 'expo-av';
import { supabase, getCurrentUser, getCurrentSession } from '../lib/supabase';
import {
  VideoUploadInput,
  VideoMetadata,
  UploadProgress,
  UploadResult,
  Video,
} from '../types';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORAGE_BUCKETS,
  VIDEO_CONSTRAINTS,
  COMPRESSION_SETTINGS,
} from '../constants/config';

// ============================================================================
// Types
// ============================================================================

interface UseVideoUploadReturn {
  // State
  progress: UploadProgress;
  selectedVideo: VideoMetadata | null;
  thumbnailUri: string | null;

  // Actions
  pickFromGallery: () => Promise<VideoMetadata | null>;
  recordVideo: () => Promise<VideoMetadata | null>;
  extractMetadata: (uri: string) => Promise<VideoMetadata | null>;
  generateThumbnail: (uri: string) => Promise<string | null>;
  uploadVideo: (input: VideoUploadInput) => Promise<UploadResult>;
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique filename for storage
 */
const generateFileName = (userId: string, extension: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}/${timestamp}_${random}.${extension}`;
};

/**
 * Get file extension from URI or MIME type
 */
const getFileExtension = (uri: string, mimeType?: string): string => {
  // Try to get from MIME type first
  if (mimeType) {
    const mimeExtensions: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    if (mimeExtensions[mimeType]) {
      return mimeExtensions[mimeType];
    }
  }

  // Fall back to URI extension
  const uriParts = uri.split('.');
  const ext = uriParts[uriParts.length - 1].toLowerCase();

  // Validate extension
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    return ext;
  }

  // Default to mp4
  return 'mp4';
};

/**
 * Get proper MIME type from file extension
 */
const getVideoMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
    'm4v': 'video/x-m4v',
  };
  return mimeTypes[extension] || 'video/mp4';
};

/**
 * Extract video metadata using expo-av
 * This extracts duration_seconds which is required by the database
 */
const extractVideoMetadata = async (uri: string): Promise<VideoMetadata | null> => {
  try {
    // Get file info for size
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }

    // Use expo-av to get video metadata including duration
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );

    // Note: Audio.Sound can load video files to extract duration
    // For more accurate video metadata, consider using expo-video's getVideoInfo
    // once it's available, or use a native module

    let duration = 0;
    let width = 0;
    let height = 0;

    // The status from createAsync doesn't always have duration for videos
    // We'll use a fallback approach
    if (status.isLoaded && status.durationMillis) {
      duration = Math.round(status.durationMillis / 1000);
    }

    // Clean up
    await sound.unloadAsync();

    // If we couldn't get duration from Audio.Sound, try alternate approach
    if (duration === 0) {
      // For now, we'll need to set a placeholder and update after upload
      // In production, use FFmpegKit or a native module for accurate metadata
      duration = 0; // Will be updated by server or native module
    }

    return {
      uri,
      duration,
      width,
      height,
      fileSize: (fileInfo as { size?: number }).size || 0,
    };
  } catch {
    return null;
  }
};

/**
 * Alternative metadata extraction using getInfoAsync pattern
 * This provides more reliable duration extraction
 */
const extractVideoMetadataFromPicker = async (
  asset: ImagePicker.ImagePickerAsset
): Promise<VideoMetadata> => {
  // ImagePicker provides duration in milliseconds for videos
  const durationMs = asset.duration || 0;
  const durationSeconds = Math.round(durationMs / 1000);

  // Get file size
  let fileSize = 0;
  try {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true });
    if (fileInfo.exists && 'size' in fileInfo) {
      fileSize = fileInfo.size || 0;
    }
  } catch {
    // Could not get file size - continue without it
  }

  return {
    uri: asset.uri,
    duration: durationSeconds,
    width: asset.width || 0,
    height: asset.height || 0,
    fileSize,
    mimeType: asset.mimeType,
  };
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVideoUpload(): UseVideoUploadReturn {
  // State
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setProgress({ stage: 'idle', progress: 0, message: '' });
    setSelectedVideo(null);
    setThumbnailUri(null);
  }, []);

  /**
   * Update progress state
   */
  const updateProgress = useCallback(
    (stage: UploadProgress['stage'], progressPercent: number, message: string, error?: string) => {
      setProgress({ stage, progress: progressPercent, message, error });
    },
    []
  );

  /**
   * Pick video from gallery
   */
  const pickFromGallery = useCallback(async (): Promise<VideoMetadata | null> => {
    try {
      updateProgress('picking', 0, 'Opening gallery...');

      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        updateProgress('error', 0, 'Permission denied', 'Media library permission is required');
        return null;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        updateProgress('idle', 0, '');
        return null;
      }

      const asset = result.assets[0];

      updateProgress('extracting', 20, 'Extracting video metadata...');

      // Extract metadata from picker result
      const metadata = await extractVideoMetadataFromPicker(asset);

      // Validate duration
      if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS) {
        updateProgress(
          'error',
          0,
          'Video too long',
          `Maximum duration is ${VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS} seconds`
        );
        return null;
      }

      if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION_SECONDS && metadata.duration > 0) {
        updateProgress(
          'error',
          0,
          'Video too short',
          `Minimum duration is ${VIDEO_CONSTRAINTS.MIN_DURATION_SECONDS} seconds`
        );
        return null;
      }

      // Validate file size
      if (metadata.fileSize > VIDEO_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
        updateProgress(
          'error',
          0,
          'File too large',
          `Maximum file size is ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
        );
        return null;
      }

      setSelectedVideo(metadata);
      updateProgress('idle', 100, 'Video selected');

      return metadata;
    } catch (error) {
      updateProgress(
        'error',
        0,
        'Failed to pick video',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }, [updateProgress]);

  /**
   * Record video using camera
   */
  const recordVideo = useCallback(async (): Promise<VideoMetadata | null> => {
    try {
      updateProgress('recording', 0, 'Opening camera...');

      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        updateProgress('error', 0, 'Permission denied', 'Camera permission is required');
        return null;
      }

      // Request microphone permissions
      const micPermission = await Audio.requestPermissionsAsync();
      if (!micPermission.granted) {
        updateProgress('error', 0, 'Permission denied', 'Microphone permission is required');
        return null;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        updateProgress('idle', 0, '');
        return null;
      }

      const asset = result.assets[0];

      updateProgress('extracting', 20, 'Extracting video metadata...');

      // Extract metadata from picker result
      const metadata = await extractVideoMetadataFromPicker(asset);

      // Validate duration
      if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS) {
        updateProgress(
          'error',
          0,
          'Video too long',
          `Maximum duration is ${VIDEO_CONSTRAINTS.MAX_DURATION_SECONDS} seconds`
        );
        return null;
      }

      setSelectedVideo(metadata);
      updateProgress('idle', 100, 'Video recorded');

      return metadata;
    } catch (error) {
      updateProgress(
        'error',
        0,
        'Failed to record video',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }, [updateProgress]);

  /**
   * Extract metadata from existing video URI
   */
  const extractMetadata = useCallback(
    async (uri: string): Promise<VideoMetadata | null> => {
      updateProgress('extracting', 0, 'Extracting metadata...');
      const metadata = await extractVideoMetadata(uri);
      if (metadata) {
        setSelectedVideo(metadata);
        updateProgress('idle', 100, 'Metadata extracted');
      } else {
        updateProgress('error', 0, 'Failed to extract metadata');
      }
      return metadata;
    },
    [updateProgress]
  );

  /**
   * Generate thumbnail from video
   */
  const generateThumbnail = useCallback(
    async (uri: string): Promise<string | null> => {
      try {
        updateProgress('generating_thumbnail', 30, 'Generating thumbnail...');

        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: 1000, // 1 second into the video
          quality: COMPRESSION_SETTINGS.THUMBNAIL_QUALITY,
        });

        setThumbnailUri(thumbUri);
        updateProgress('idle', 100, 'Thumbnail generated');

        return thumbUri;
      } catch {
        // Thumbnail generation failure is not critical, continue without it
        updateProgress('idle', 100, 'Thumbnail generation skipped');
        return null;
      }
    },
    [updateProgress]
  );

  /**
   * Upload video to Supabase Storage and create database record
   */
  const uploadVideo = useCallback(
    async (input: VideoUploadInput): Promise<UploadResult> => {
      try {
        // Validate we have a selected video
        if (!selectedVideo) {
          return { success: false, error: 'No video selected' };
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          return { success: false, error: 'User not authenticated' };
        }

        // Generate thumbnail if not already done
        let thumbUri = thumbnailUri;
        if (!thumbUri) {
          updateProgress('generating_thumbnail', 10, 'Generating thumbnail...');
          thumbUri = await generateThumbnail(selectedVideo.uri);
        }

        // ====================================================================
        // COMPRESSION NOTE:
        // Video compression in Expo managed workflow is limited.
        // For production, consider:
        // 1. expo-video-compressor (requires prebuild/native)
        // 2. ffmpeg-kit-react-native (requires prebuild/native)
        // 3. Server-side compression after upload
        //
        // Current implementation uploads original quality.
        // See COMPRESSION.md for detailed options.
        // ====================================================================

        updateProgress('uploading', 20, 'Uploading video...');

        // Get auth token for storage upload
        const session = await getCurrentSession();
        if (!session) {
          throw new Error('No active session');
        }

        // Generate filename
        const videoExtension = getFileExtension(selectedVideo.uri, selectedVideo.mimeType);
        const videoFileName = generateFileName(user.id, videoExtension);

        // Upload video using FileSystem.uploadAsync (native file transfer, avoids empty blob issues)
        const videoUploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.VIDEOS}/${videoFileName}`;
        const videoUploadResult = await FileSystem.uploadAsync(videoUploadUrl, selectedVideo.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': getVideoMimeType(videoExtension),
          },
        });

        if (videoUploadResult.status < 200 || videoUploadResult.status >= 300) {
          throw new Error(`Video upload failed: ${videoUploadResult.body}`);
        }

        updateProgress('uploading', 60, 'Uploading thumbnail...');

        // Upload thumbnail if available
        let thumbnailUrl: string | null = null;
        if (thumbUri) {
          try {
            const thumbnailFileName = generateFileName(user.id, 'jpg');

            const thumbUploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.THUMBNAILS}/${thumbnailFileName}`;
            const thumbUploadResult = await FileSystem.uploadAsync(thumbUploadUrl, thumbUri, {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'image/jpeg',
              },
            });

            if (thumbUploadResult.status >= 200 && thumbUploadResult.status < 300) {
              const { data: thumbUrlData } = supabase.storage
                .from(STORAGE_BUCKETS.THUMBNAILS)
                .getPublicUrl(thumbnailFileName);

              thumbnailUrl = thumbUrlData.publicUrl;
            }
          } catch {
            // Thumbnail upload failed, continuing without it
          }
        }

        // Get public URL for video
        const { data: videoUrlData } = supabase.storage
          .from(STORAGE_BUCKETS.VIDEOS)
          .getPublicUrl(videoFileName);

        updateProgress('creating_record', 80, 'Creating video record...');

        // Create video record in database
        const videoRecord: Partial<Video> = {
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: selectedVideo.duration || null,
          width: selectedVideo.width || null,
          height: selectedVideo.height || null,
          file_size_bytes: selectedVideo.fileSize || null,
          status: 'processing', // Will be updated to 'ready' after server processing
          visibility: input.visibility || 'public',
          parent_video_id: input.parentVideoId || null,
        };

        // Add agree_disagree for response videos
        if (input.parentVideoId && input.agreeDisagree !== undefined) {
          (videoRecord as Record<string, unknown>).agree_disagree = input.agreeDisagree;
        }

        const { data: insertedVideo, error: insertError } = await supabase
          .from('videos')
          .insert(videoRecord)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create video record: ${insertError.message}`);
        }

        // Update status to ready (in production, this would be done by server after processing)
        const { data: updatedVideo, error: updateError } = await supabase
          .from('videos')
          .update({ status: 'ready', published_at: new Date().toISOString() })
          .eq('id', insertedVideo.id)
          .select()
          .single();

        // Status update error is non-critical

        updateProgress('complete', 100, 'Upload complete!');

        return {
          success: true,
          video: updatedVideo || insertedVideo,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateProgress('error', 0, 'Upload failed', errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [selectedVideo, thumbnailUri, generateThumbnail, updateProgress]
  );

  return {
    // State
    progress,
    selectedVideo,
    thumbnailUri,

    // Actions
    pickFromGallery,
    recordVideo,
    extractMetadata,
    generateThumbnail,
    uploadVideo,
    reset,
  };
}

export default useVideoUpload;

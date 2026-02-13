import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getVideoWithResponses,
  getParentVideo,
  getVideoResponses,
  VideoWithProfile,
  VideoResponse,
  ResponseCounts,
} from '../lib/video';

const DETAIL_STALE_TIME = 1000 * 60 * 2; // 2 minutes

/**
 * Hook to fetch a video with its responses and counts
 */
export function useVideoWithResponses(videoId: string | undefined) {
  return useQuery({
    queryKey: ['video-with-responses', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const result = await getVideoWithResponses(videoId);
      if (result.error) throw result.error;
      return {
        video: result.video,
        responses: result.responses,
        responseCounts: result.responseCounts,
      };
    },
    enabled: !!videoId,
    staleTime: DETAIL_STALE_TIME,
  });
}

/**
 * Hook to fetch parent video info if current video is a response.
 * Uses parentVideoId from the already-fetched video to skip the extra lookup query.
 */
export function useParentVideo(
  videoId: string | undefined,
  parentVideoId: string | null | undefined
) {
  return useQuery({
    queryKey: ['parent-video', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const result = await getParentVideo(videoId, parentVideoId);
      if (result.error) throw result.error;
      return result.parent;
    },
    // Only fetch when we know this video has a parent
    enabled: !!videoId && parentVideoId !== undefined,
    staleTime: DETAIL_STALE_TIME,
  });
}

/**
 * Hook to fetch paginated responses for a video with infinite scroll support
 */
export function useInfiniteResponses(
  videoId: string | undefined,
  stance: 'agree' | 'disagree' | 'all' = 'all'
) {
  return useInfiniteQuery({
    queryKey: ['video-responses', videoId, stance],
    queryFn: async ({ pageParam = 0 }) => {
      if (!videoId) throw new Error('Video ID is required');
      const result = await getVideoResponses(videoId, {
        offset: pageParam,
        limit: 20,
        stance,
      });
      if (result.error) throw result.error;
      return {
        responses: result.responses,
        hasMore: result.hasMore,
        nextOffset: pageParam + 20,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    enabled: !!videoId,
  });
}

/**
 * Combined hook for response chain data
 * Returns all data needed for displaying a video's response chain
 */
export function useResponseChain(videoId: string | undefined) {
  const videoQuery = useVideoWithResponses(videoId);

  // Pass parent_video_id from already-loaded video to skip the lookup query
  const parentVideoId = videoQuery.data?.video?.parent_video_id;
  const parentQuery = useParentVideo(videoId, parentVideoId);

  const isLoading = videoQuery.isLoading || (parentVideoId ? parentQuery.isLoading : false);
  const isError = videoQuery.isError || parentQuery.isError;
  const error = videoQuery.error || parentQuery.error;

  return {
    // Main video data
    video: videoQuery.data?.video ?? null,

    // Response data
    responses: videoQuery.data?.responses ?? [],
    responseCounts: videoQuery.data?.responseCounts ?? {
      agree: 0,
      disagree: 0,
      total: 0,
    },

    // Parent video (if this is a response)
    parentVideo: parentQuery.data ?? null,
    isResponse: !!parentQuery.data,

    // Loading and error states
    isLoading,
    isError,
    error,

    // Refetch functions
    refetch: () => {
      videoQuery.refetch();
      parentQuery.refetch();
    },
  };
}

// Re-export types for convenience
export type { VideoWithProfile, VideoResponse, ResponseCounts };

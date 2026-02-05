import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getVideoWithResponses,
  getResponseCounts,
  getParentVideo,
  getRootVideo,
  getVideoResponses,
  VideoWithProfile,
  VideoResponse,
  ResponseCounts,
} from '../lib/video';

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
  });
}

/**
 * Hook to fetch response counts for a video
 */
export function useResponseCounts(videoId: string | undefined) {
  return useQuery({
    queryKey: ['response-counts', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      return getResponseCounts(videoId);
    },
    enabled: !!videoId,
  });
}

/**
 * Hook to fetch parent video info if current video is a response
 */
export function useParentVideo(videoId: string | undefined) {
  return useQuery({
    queryKey: ['parent-video', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const result = await getParentVideo(videoId);
      if (result.error) throw result.error;
      return result.parent;
    },
    enabled: !!videoId,
  });
}

/**
 * Hook to fetch root video info (original video in the chain)
 */
export function useRootVideo(videoId: string | undefined) {
  return useQuery({
    queryKey: ['root-video', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const result = await getRootVideo(videoId);
      if (result.error) throw result.error;
      return result.root;
    },
    enabled: !!videoId,
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
  const parentQuery = useParentVideo(videoId);
  const rootQuery = useRootVideo(videoId);

  const isLoading = videoQuery.isLoading || parentQuery.isLoading || rootQuery.isLoading;
  const isError = videoQuery.isError || parentQuery.isError || rootQuery.isError;
  const error = videoQuery.error || parentQuery.error || rootQuery.error;

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

    // Root video (original video in the chain)
    rootVideo: rootQuery.data ?? null,

    // Loading and error states
    isLoading,
    isError,
    error,

    // Refetch functions
    refetch: () => {
      videoQuery.refetch();
      parentQuery.refetch();
      rootQuery.refetch();
    },
  };
}

// Re-export types for convenience
export type { VideoWithProfile, VideoResponse, ResponseCounts };

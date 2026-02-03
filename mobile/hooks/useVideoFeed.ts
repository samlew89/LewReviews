// ============================================================================
// LewReviews Mobile - useVideoFeed Hook
// Fetches videos from Supabase with pagination and pull-to-refresh
// ============================================================================

import { useCallback, useState, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '../lib/supabase';
import type { FeedVideo } from '../types';

const PAGE_SIZE = 10;

interface UseVideoFeedOptions {
  parentVideoId?: string; // Filter by parent video (for response chains)
  userId?: string; // Filter by user
}

interface FeedPage {
  videos: FeedVideo[];
  nextCursor: string | null;
}

export function useVideoFeed(options: UseVideoFeedOptions = {}) {
  const queryClient = useQueryClient();
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user on mount
  useEffect(() => {
    getCurrentUser().then((user) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Fetch user's liked videos
  useEffect(() => {
    if (!currentUserId) return;

    const fetchLikes = async () => {
      const { data, error } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', currentUserId);

      if (!error && data) {
        setLikedVideoIds(new Set(data.map((like) => like.video_id)));
      }
    };

    fetchLikes();
  }, [currentUserId]);

  // Fetch feed videos with pagination
  const fetchVideos = useCallback(
    async ({ pageParam }: { pageParam: string | null }): Promise<FeedPage> => {
      let query = supabase
        .from('feed_videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      // Filter by parent video if specified (for response chains)
      if (options.parentVideoId) {
        query = query.eq('parent_video_id', options.parentVideoId);
      } else {
        // For main feed, only show root videos (no responses)
        query = query.is('parent_video_id', null);
      }

      // Filter by user if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      // Cursor-based pagination
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const videos = (data as FeedVideo[]) || [];
      const nextCursor =
        videos.length === PAGE_SIZE
          ? videos[videos.length - 1].created_at
          : null;

      return { videos, nextCursor };
    },
    [options.parentVideoId, options.userId]
  );

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey: ['videos', options.parentVideoId, options.userId],
    queryFn: fetchVideos,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Flatten pages into single array
  const videos = data?.pages.flatMap((page) => page.videos) || [];

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!currentUserId) throw new Error('Must be logged in to like');

      const isLiked = likedVideoIds.has(videoId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('video_id', videoId);

        if (error) throw error;
        return { videoId, liked: false };
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({
          user_id: currentUserId,
          video_id: videoId,
        });

        if (error) throw error;
        return { videoId, liked: true };
      }
    },
    onMutate: async (videoId) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['videos', options.parentVideoId, options.userId] });

      const isLiked = likedVideoIds.has(videoId);

      // Optimistic update for liked state
      const newLikedIds = new Set(likedVideoIds);
      if (isLiked) {
        newLikedIds.delete(videoId);
      } else {
        newLikedIds.add(videoId);
      }
      setLikedVideoIds(newLikedIds);

      // Optimistic update for like count in feed data
      const previousData = queryClient.getQueryData(['videos', options.parentVideoId, options.userId]);
      queryClient.setQueryData(
        ['videos', options.parentVideoId, options.userId],
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: FeedPage) => ({
              ...page,
              videos: page.videos.map((v: FeedVideo) =>
                v.id === videoId
                  ? { ...v, likes_count: v.likes_count + (isLiked ? -1 : 1) }
                  : v
              ),
            })),
          };
        }
      );

      return { previousLikedIds: likedVideoIds, previousData };
    },
    onError: (_err, _videoId, context) => {
      // Rollback on error
      if (context?.previousLikedIds) {
        setLikedVideoIds(context.previousLikedIds);
      }
      if (context?.previousData) {
        queryClient.setQueryData(
          ['videos', options.parentVideoId, options.userId],
          context.previousData
        );
      }
    },
  });

  // Handle like press
  const handleLikePress = useCallback(
    (videoId: string) => {
      if (!currentUserId) {
        // TODO: Prompt login
        return;
      }
      likeMutation.mutate(videoId);
    },
    [currentUserId, likeMutation]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    videos,
    isLoading,
    isRefreshing: isRefetching,
    hasMore: hasNextPage || false,
    error,
    likedVideoIds,
    onRefresh: handleRefresh,
    onLoadMore: handleLoadMore,
    onLikePress: handleLikePress,
  };
}

// Hook for fetching a single video with its response chain
export function useVideoDetail(videoId: string) {
  return useInfiniteQuery({
    queryKey: ['video', videoId, 'responses'],
    queryFn: async ({ pageParam }) => {
      // First, get the video itself
      const { data: video, error: videoError } = await supabase
        .from('feed_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      // Then get responses
      let query = supabase
        .from('feed_videos')
        .select('*')
        .eq('parent_video_id', videoId)
        .order('likes_count', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data: responses, error: responsesError } = await query;

      if (responsesError) throw responsesError;

      const nextCursor =
        responses && responses.length === PAGE_SIZE
          ? responses[responses.length - 1].created_at
          : null;

      return {
        video: video as FeedVideo,
        responses: (responses as FeedVideo[]) || [],
        nextCursor,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

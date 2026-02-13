// ============================================================================
// LewReviews Mobile - useVideoFeed Hook
// Fetches videos from Supabase with pagination and pull-to-refresh
// ============================================================================

import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
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
    queryKey: ['feed', options.parentVideoId, options.userId],
    queryFn: fetchVideos,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60, // 1 minute — prevents aggressive refetches on tab switches
  });

  // Flatten pages into single array
  const videos = data?.pages.flatMap((page) => page.videos) || [];

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
    onRefresh: handleRefresh,
    onLoadMore: handleLoadMore,
  };
}

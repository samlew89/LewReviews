// ============================================================================
// LewReviews Mobile - Follow List Hook
// ============================================================================
// Fetches paginated followers or following lists with profile joins
// ============================================================================

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FollowListUser } from '../types';

const PAGE_SIZE = 20;

interface FollowRow {
  created_at: string;
  profiles: FollowListUser;
}

export function useFollowList(userId: string, type: 'followers' | 'following') {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['follow-list', userId, type],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      // For followers: find rows where following_id = userId, join follower's profile
      // For following: find rows where follower_id = userId, join followed user's profile
      const foreignKey = type === 'followers' ? 'following_id' : 'follower_id';
      const joinKey = type === 'followers' ? 'follower_id' : 'following_id';

      let query = supabase
        .from('follows')
        .select(`created_at, profiles:${joinKey} (id, username, display_name, avatar_url)`)
        .eq(foreignKey, userId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data as unknown as FollowRow[];
      return {
        users: rows.map((row) => row.profiles),
        cursor: rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!userId,
  });

  const users = data?.pages.flatMap((page) => page.users) ?? [];

  return {
    users,
    isLoading,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
    isLoadingMore: isFetchingNextPage,
    refresh: refetch,
  };
}

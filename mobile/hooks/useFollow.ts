// ============================================================================
// LewReviews Mobile - Follow Hook
// ============================================================================
// Handles follow/unfollow functionality with optimistic updates
// ============================================================================

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

interface FollowState {
  isFollowing: boolean;
  followersCount: number;
}

interface UseFollowReturn {
  isFollowing: boolean;
  followersCount: number;
  isLoading: boolean;
  isToggling: boolean;
  toggleFollow: () => Promise<void>;
  error: string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFollow(targetUserId: string): UseFollowReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query key for caching follow state
  const queryKey = ['follow-state', targetUserId];

  // Fetch initial follow state
  const { data: followState, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FollowState> => {
      const user = await getCurrentUser();

      // Get followers count
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      // Check if current user follows target
      let isFollowing = false;
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        isFollowing = !!followData;
      }

      return {
        isFollowing,
        followersCount: profileData?.followers_count || 0,
      };
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Toggle follow mutation with optimistic updates
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Must be logged in to follow users');
      }

      if (user.id === targetUserId) {
        throw new Error('Cannot follow yourself');
      }

      // Call Supabase toggle_follow function
      const { data, error: rpcError } = await supabase.rpc('toggle_follow', {
        target_user_id: targetUserId,
      });

      if (rpcError) throw rpcError;

      return data as boolean; // Returns true if now following, false if unfollowed
    },
    onMutate: async () => {
      setError(null);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousState = queryClient.getQueryData<FollowState>(queryKey);

      // Optimistically update
      if (previousState) {
        queryClient.setQueryData<FollowState>(queryKey, {
          isFollowing: !previousState.isFollowing,
          followersCount: previousState.isFollowing
            ? previousState.followersCount - 1
            : previousState.followersCount + 1,
        });
      }

      return { previousState };
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
      setError(err instanceof Error ? err.message : 'Failed to update follow status');
    },
    onSuccess: () => {
      // Refetch to ensure consistency after successful mutation
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
      // Invalidate leaderboard following tab since follow list changed
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'following'] });
    },
  });

  const toggleFollow = useCallback(async () => {
    await toggleMutation.mutateAsync();
  }, [toggleMutation]);

  return {
    isFollowing: followState?.isFollowing ?? false,
    followersCount: followState?.followersCount ?? 0,
    isLoading,
    isToggling: toggleMutation.isPending,
    toggleFollow,
    error,
  };
}

export default useFollow;

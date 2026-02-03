// ============================================================================
// LewReviews Mobile - Video Vote Hook
// Handles agree/disagree voting with optimistic updates
// ============================================================================

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface UseVideoVoteOptions {
  videoId: string;
  initialVote?: boolean | null;
  initialAgreeCount: number;
  initialDisagreeCount: number;
}

interface UseVideoVoteReturn {
  userVote: boolean | null;
  agreeCount: number;
  disagreeCount: number;
  vote: (newVote: boolean) => void;
  isVoting: boolean;
}

export function useVideoVote({
  videoId,
  initialVote = null,
  initialAgreeCount,
  initialDisagreeCount,
}: UseVideoVoteOptions): UseVideoVoteReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Local state for optimistic updates
  const [userVote, setUserVote] = useState<boolean | null>(initialVote);
  const [agreeCount, setAgreeCount] = useState(initialAgreeCount);
  const [disagreeCount, setDisagreeCount] = useState(initialDisagreeCount);

  const voteMutation = useMutation({
    mutationFn: async (newVote: boolean | null) => {
      if (!user) throw new Error('Must be logged in to vote');

      if (newVote === null) {
        // Remove vote
        const { error } = await supabase
          .from('video_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        if (error) throw error;
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('video_votes')
          .upsert(
            {
              user_id: user.id,
              video_id: videoId,
              vote: newVote,
            },
            { onConflict: 'user_id,video_id' }
          );
        if (error) throw error;
      }
      return newVote;
    },
    onError: () => {
      // Revert optimistic update on error
      setUserVote(initialVote);
      setAgreeCount(initialAgreeCount);
      setDisagreeCount(initialDisagreeCount);
    },
    onSuccess: () => {
      // Invalidate feed queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const vote = useCallback(
    (newVote: boolean) => {
      if (!user) return;

      const previousVote = userVote;
      let newAgreeCount = agreeCount;
      let newDisagreeCount = disagreeCount;

      if (previousVote === newVote) {
        // Deselect: remove vote
        if (newVote === true) {
          newAgreeCount--;
        } else {
          newDisagreeCount--;
        }
        setUserVote(null);
        setAgreeCount(newAgreeCount);
        setDisagreeCount(newDisagreeCount);
        voteMutation.mutate(null);
      } else {
        // New vote or switch
        if (previousVote === true) {
          // Was agree, now disagree
          newAgreeCount--;
          newDisagreeCount++;
        } else if (previousVote === false) {
          // Was disagree, now agree
          newDisagreeCount--;
          newAgreeCount++;
        } else {
          // No previous vote
          if (newVote === true) {
            newAgreeCount++;
          } else {
            newDisagreeCount++;
          }
        }
        setUserVote(newVote);
        setAgreeCount(newAgreeCount);
        setDisagreeCount(newDisagreeCount);
        voteMutation.mutate(newVote);
      }

    },
    [user, userVote, agreeCount, disagreeCount, videoId, voteMutation]
  );

  return {
    userVote,
    agreeCount,
    disagreeCount,
    vote,
    isVoting: voteMutation.isPending,
  };
}

// ============================================================================
// LewReviews Mobile - Leaderboard Hook
// ============================================================================
// Fetches top users by ratio (agrees - disagrees) for All and Friends tabs
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '../lib/supabase';
import type { Profile } from '../types';

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  ratio: number;
  agrees_received_count: number;
  disagrees_received_count: number;
  rank: number;
}

function toLeaderboardEntries(profiles: Profile[]): LeaderboardEntry[] {
  return profiles
    .map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      ratio: (p.agrees_received_count || 0) - (p.disagrees_received_count || 0),
      agrees_received_count: p.agrees_received_count || 0,
      disagrees_received_count: p.disagrees_received_count || 0,
      rank: 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function useLeaderboard(tab: 'all' | 'friends') {
  return useQuery({
    queryKey: ['leaderboard', tab],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (tab === 'all') {
        // All users, sorted by ratio (computed client-side since Supabase can't sort by computed column)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
          .limit(50);

        if (error) throw error;
        return toLeaderboardEntries(data as Profile[]);
      }

      // Friends: only users the current user follows
      const user = await getCurrentUser();
      if (!user) return [];

      // Get list of user IDs this user follows
      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followError) throw followError;
      if (!followRows || followRows.length === 0) return [];

      const followedIds = followRows.map((r) => r.following_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
        .in('id', followedIds);

      if (error) throw error;
      return toLeaderboardEntries(data as Profile[]);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

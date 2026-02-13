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
        // Fetch top users ordered by agrees descending, limit to 50
        // Server-side ordering uses agrees_received_count as the primary sort
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
          .order('agrees_received_count', { ascending: false })
          .limit(50);

        if (error) throw error;
        return toLeaderboardEntries(data as Profile[]);
      }

      // Friends: fetch followed profiles in a single query using inner join via follows table
      const user = await getCurrentUser();
      if (!user) return [];

      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('profiles:following_id (id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count)')
        .eq('follower_id', user.id);

      if (followError) throw followError;
      if (!followRows || followRows.length === 0) return [];

      // Extract nested profile objects
      const profiles = followRows
        .map((r: Record<string, unknown>) => r.profiles as Profile)
        .filter(Boolean);

      return toLeaderboardEntries(profiles);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

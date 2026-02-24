// ============================================================================
// LewReviews Mobile - Leaderboard Hook
// ============================================================================
// Fetches top users by ratio (agrees - disagrees) for All and Following tabs
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
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
  isCurrentUser?: boolean;
}

function toLeaderboardEntries(profiles: Profile[], currentUserId?: string): LeaderboardEntry[] {
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
      isCurrentUser: currentUserId ? p.id === currentUserId : false,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function useLeaderboard(tab: 'all' | 'following') {
  const { user } = useAuth();
  const currentUserId = user?.id;

  return useQuery({
    queryKey: ['leaderboard', tab, currentUserId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (tab === 'all') {
        // Fetch top users and current user profile in parallel
        const [topUsersResult, currentUserResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
            .order('agrees_received_count', { ascending: false })
            .limit(50),
          currentUserId
            ? supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
                .eq('id', currentUserId)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (topUsersResult.error) throw topUsersResult.error;

        // Build profiles list, ensuring current user is included
        const topProfiles = topUsersResult.data as Profile[];
        const currentUserInTop = currentUserId && topProfiles.some((p) => p.id === currentUserId);

        let profiles: Profile[];
        if (currentUserResult.data && !currentUserInTop) {
          // Add current user if not already in top 50
          profiles = [...topProfiles, currentUserResult.data as Profile];
        } else {
          profiles = topProfiles;
        }

        return toLeaderboardEntries(profiles, currentUserId);
      }

      // Following: fetch followed profiles + current user
      if (!currentUserId) return [];

      // Fetch current user's profile and followed profiles in parallel
      const [currentUserResult, followResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count')
          .eq('id', currentUserId)
          .single(),
        supabase
          .from('follows')
          .select('profiles:following_id (id, username, display_name, avatar_url, agrees_received_count, disagrees_received_count)')
          .eq('follower_id', currentUserId),
      ]);

      if (followResult.error) throw followResult.error;

      // Extract nested profile objects from follows
      const followedProfiles = (followResult.data || [])
        .map((r: Record<string, unknown>) => r.profiles as Profile)
        .filter(Boolean);

      // Add current user to the list (if profile fetch succeeded)
      const profiles: Profile[] = [...followedProfiles];
      if (currentUserResult.data) {
        profiles.push(currentUserResult.data as Profile);
      }

      // If no followed users and no current user, return empty
      if (profiles.length === 0) return [];

      return toLeaderboardEntries(profiles, currentUserId);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

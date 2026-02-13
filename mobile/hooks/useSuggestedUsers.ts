// ============================================================================
// LewReviews Mobile - Suggested Users Hook
// ============================================================================
// Fetches most-followed users as suggestions for the Discover tab
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '../lib/supabase';
import type { UserSearchResult } from '../types';

export function useSuggestedUsers() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: async (): Promise<UserSearchResult[]> => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, followers_count')
        .order('followers_count', { ascending: false })
        .limit(11); // Fetch one extra in case we need to filter out current user

      if (error) throw error;

      const results = (data as UserSearchResult[]).filter(
        (profile) => profile.id !== user?.id
      );
      return results.slice(0, 10);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    users: data ?? [],
    isLoading,
    refetch,
  };
}

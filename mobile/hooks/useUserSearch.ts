// ============================================================================
// LewReviews Mobile - User Search Hook
// ============================================================================
// Debounced search against the profiles table for the Discover tab
// ============================================================================

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserSearchResult } from '../types';

export function useUserSearch(searchQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, followers_count')
        .ilike('username', `%${debouncedQuery}%`)
        .order('followers_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as UserSearchResult[];
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    results: data ?? [],
    isLoading: debouncedQuery.length > 0 && isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

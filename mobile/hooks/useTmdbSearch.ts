import { useState, useCallback, useRef } from 'react';
import { getCurrentSession } from '../lib/supabase';
import { SUPABASE_URL } from '../constants/config';
import type { TmdbSearchResult } from '../types';

interface UseTmdbSearchReturn {
  results: TmdbSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useTmdbSearch(): UseTmdbSearchReturn {
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Clear results if query is too short
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Debounce search by 300ms
    debounceRef.current = setTimeout(async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/tmdb-search?query=${encodeURIComponent(query.trim())}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { results, isLoading, error, search, clear };
}

export default useTmdbSearch;

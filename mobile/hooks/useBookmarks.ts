import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { FeedVideo } from '../types';

/**
 * Hook to manage bookmark state for a set of videos (batch check).
 * Returns a Set of bookmarked video IDs and a toggle function.
 */
export function useBookmarks(videoIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch bookmarked video IDs for the current user
  const { data: bookmarkedIds = new Set<string>() } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();

      const { data, error } = await supabase
        .from('bookmarks')
        .select('video_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return new Set(data.map((b) => b.video_id));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const toggleBookmark = useCallback(
    async (videoId: string) => {
      if (!user?.id) return;

      const isCurrentlyBookmarked = bookmarkedIds.has(videoId);

      // Optimistic update
      queryClient.setQueryData(['bookmarks', user.id], (old: Set<string> | undefined) => {
        const next = new Set(old || []);
        if (isCurrentlyBookmarked) {
          next.delete(videoId);
        } else {
          next.add(videoId);
        }
        return next;
      });

      try {
        if (isCurrentlyBookmarked) {
          const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bookmarks')
            .insert({ user_id: user.id, video_id: videoId });
          if (error) throw error;
        }
      } catch {
        // Revert optimistic update
        queryClient.setQueryData(['bookmarks', user.id], (old: Set<string> | undefined) => {
          const next = new Set(old || []);
          if (isCurrentlyBookmarked) {
            next.add(videoId);
          } else {
            next.delete(videoId);
          }
          return next;
        });
      }
    },
    [user?.id, bookmarkedIds, queryClient]
  );

  return { bookmarkedIds, toggleBookmark };
}

/**
 * Hook to fetch the current user's bookmarked videos for profile display.
 */
export function useBookmarkedVideos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookmarked-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('bookmarks')
        .select('video_id, videos(id, thumbnail_url, views_count, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten the joined result
      return (data || [])
        .map((b: any) => b.videos)
        .filter(Boolean);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
}

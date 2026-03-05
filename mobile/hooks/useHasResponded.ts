import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Check if the current user has already responded to a given root video.
 * Returns { hasResponded, originalStance } where originalStance is the
 * agree_disagree value from their first response (needed for follow-up replies).
 */
export function useHasResponded(rootVideoId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-responded', rootVideoId, user?.id],
    queryFn: async () => {
      if (!rootVideoId || !user?.id) return { hasResponded: false, originalStance: undefined as boolean | undefined };
      const { data, error } = await supabase
        .from('videos')
        .select('agree_disagree')
        .eq('user_id', user.id)
        .eq('parent_video_id', rootVideoId)
        .eq('status', 'ready')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error || !data || data.length === 0) return { hasResponded: false, originalStance: undefined as boolean | undefined };
      return { hasResponded: true, originalStance: data[0].agree_disagree as boolean };
    },
    enabled: !!rootVideoId && !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
}

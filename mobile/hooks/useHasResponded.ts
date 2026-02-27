import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Check if the current user has already responded to a given root video.
 * Returns true if they have at least one response, false otherwise.
 */
export function useHasResponded(rootVideoId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-responded', rootVideoId, user?.id],
    queryFn: async () => {
      if (!rootVideoId || !user?.id) return false;
      const { count, error } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('parent_video_id', rootVideoId)
        .eq('status', 'ready');
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!rootVideoId && !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
}

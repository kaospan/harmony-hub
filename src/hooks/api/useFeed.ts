/**
 * Feed-related hooks for user interactions and stats
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserInteractionStats {
  likes: number;
  saves: number;
  shares: number;
}

/**
 * Hook to fetch user interaction statistics
 */
export function useUserInteractionStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-interaction-stats', userId],
    queryFn: async (): Promise<UserInteractionStats> => {
      if (!userId) return { likes: 0, saves: 0, shares: 0 };

      const [likesResult, savesResult, sharesResult] = await Promise.all([
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('interaction_type', 'like'),
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('interaction_type', 'save'),
        supabase
          .from('user_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('interaction_type', 'share'),
      ]);

      return {
        likes: likesResult.count || 0,
        saves: savesResult.count || 0,
        shares: sharesResult.count || 0,
      };
    },
    enabled: !!userId,
  });
}

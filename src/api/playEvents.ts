/**
 * Play Events API
 * Simple wrapper for recording play events without requiring React hooks
 */

import { supabase } from '@/integrations/supabase/client';
import { MusicProvider } from '@/types';

type PlayAction = 'open_app' | 'open_web' | 'preview';

interface RecordPlayEventParams {
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a play event (non-hook version for use outside React components)
 */
export async function recordPlayEvent(params: RecordPlayEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('user_interactions').insert({
        user_id: user.id,
        track_id: params.track_id,
        interaction_type: `play_${params.action}`,
      });
    }
  } catch (error) {
    console.warn('Failed to record play event:', error);
  }
}

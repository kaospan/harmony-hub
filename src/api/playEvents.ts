import { supabase } from '@/integrations/supabase/client';
import { MusicProvider } from '@/types';

export type PlayAction = 'open_app' | 'open_web' | 'preview';

export interface RecordPlayEventParams {
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
  user_id?: string | null;
}

export interface PlayEventData {
  id: string;
  user_id?: string | null;
  track_id: string;
  provider: string;
  action: string;
  played_at: string;
  context?: string;
}

export async function recordPlayEvent(params: RecordPlayEventParams): Promise<PlayEventData> {
  const { data, error } = await supabase
    .from('play_events')
    .insert({
      user_id: params.user_id ?? null,
      track_id: params.track_id,
      provider: params.provider,
      action: params.action,
      context: params.context,
      device: params.device,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    user_id: data.user_id,
    track_id: data.track_id,
    provider: data.provider,
    action: data.action,
    played_at: data.played_at,
    context: data.context,
  };
}

export async function fetchPlayHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('play_events')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}

export async function fetchPlayStats(userId: string) {
  const { count } = await supabase
    .from('play_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    totalPlays: count || 0,
    providerCounts: {} as Record<string, number>,
    recentPlays: 0,
  };
}

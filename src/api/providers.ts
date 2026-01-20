import { supabase } from '@/integrations/supabase/client';

export interface ConnectedProvidersResponse {
  spotify: { connected: boolean; premium: boolean };
}

const defaultConnectedProviders: ConnectedProvidersResponse = {
  spotify: { connected: false, premium: false },
};

export async function fetchConnectedProviders(): Promise<ConnectedProvidersResponse> {
  const { data, error } = await supabase.rpc('get_connected_providers');
  if (error) throw error;
  return data ?? defaultConnectedProviders;
}

export function getConnectedProvidersFallback(): ConnectedProvidersResponse {
  return defaultConnectedProviders;
}

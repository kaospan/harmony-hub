import { useQuery } from '@tanstack/react-query';
import { fetchConnectedProviders, getConnectedProvidersFallback, ConnectedProvidersResponse } from '@/api/providers';
import { useAuth } from '@/hooks/useAuth';

export type { ConnectedProvidersResponse } from '@/api/providers';

export function useConnectedProviders(): ConnectedProvidersResponse {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['connected-providers', user?.id],
    queryFn: fetchConnectedProviders,
    enabled: !!user,
    staleTime: 60_000,
  });

  if (!user) return getConnectedProvidersFallback();
  return data ?? getConnectedProvidersFallback();
}

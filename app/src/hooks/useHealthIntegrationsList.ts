import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IntegrationId } from '@/lib/health/integrationStore';
import {
  getIntegrationDefinitions,
  getIntegrationsWithStatus,
} from '@/lib/health/integrations';

const QUERY_KEY = ['health-integrations'];

export function useHealthIntegrationsList() {
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getIntegrationsWithStatus,
  });

  const connectMutation = useMutation({
    mutationFn: async (id: IntegrationId) => {
      const definition = getIntegrationDefinitions().find((item) => item.id === id);
      if (!definition) {
        throw new Error('Unknown integration');
      }
      const result = await definition.connect();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return { id, result };
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: IntegrationId) => {
      const definition = getIntegrationDefinitions().find((item) => item.id === id);
      if (!definition) {
        throw new Error('Unknown integration');
      }
      if (definition.disconnect) {
        await definition.disconnect();
      }
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return { id };
    },
  });

  return {
    integrations: integrationsQuery.data ?? [],
    integrationsLoading: integrationsQuery.isLoading,
    integrationsError: integrationsQuery.error,
    refreshIntegrations: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    connectIntegration: connectMutation.mutateAsync,
    disconnectIntegration: disconnectMutation.mutateAsync,
    connectingId: connectMutation.variables,
    connectIntegrationPending: connectMutation.isPending,
    disconnectingId: disconnectMutation.variables,
    disconnectIntegrationPending: disconnectMutation.isPending,
  };
}


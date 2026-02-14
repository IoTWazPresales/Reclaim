/**
 * Shared QueryClient instance for use outside React components
 * (e.g. notification handlers that need to invalidate queries)
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Free hosting tiers sleep when idle, so the first request after a quiet period can take a minute.
 * Transient failures (network / 502 / 503 / 504) are retried with back-off for roughly 90 seconds;
 * 4xx errors are never retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => (error instanceof ApiError ? error.isTransient && failureCount < 9 : failureCount < 1),
      retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 10_000),
    },
    mutations: { retry: false },
  },
});

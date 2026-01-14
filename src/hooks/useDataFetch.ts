/**
 * Data fetching hook with caching and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { CanonicalQuery } from '../types/query';
import { NormalizedDataset } from '../types/dataset';
import { getAdapter } from '../data/adapters';
import { FetchError } from '../services/fetch';

interface UseDataFetchResult {
  data: NormalizedDataset | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching data based on a query
 */
export function useDataFetch(query: CanonicalQuery | null): UseDataFetchResult {
  const [data, setData] = useState<NormalizedDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!query) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const adapter = getAdapter(query.sourceId);
      const result = await adapter.execute(query);
      setData(result);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  // Fetch data when query changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof FetchError) {
    if (err.isCorsError) {
      return 'This data source is not accessible from your browser due to CORS restrictions.';
    }
    if (err.isTimeout) {
      return 'Request timed out. Please try again.';
    }
    if (err.status === 429) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (err.status === 404) {
      return 'Data not found. Please check your query parameters.';
    }
    return `Failed to fetch data: ${err.message}`;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'An unexpected error occurred.';
}

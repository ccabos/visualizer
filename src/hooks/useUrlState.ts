/**
 * URL state synchronization hook
 */

import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CanonicalQuery } from '../types/query';
import { useQueryStore } from '../store/queryStore';

/**
 * Encode query state to URL-safe base64
 */
export function encodeState(state: CanonicalQuery): string {
  const json = JSON.stringify(state);
  const base64 = btoa(encodeURIComponent(json));
  // Make URL-safe
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode URL-safe base64 to query state
 */
export function decodeState(encoded: string): CanonicalQuery | null {
  try {
    // Restore base64 characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (base64.length % 4) {
      base64 += '=';
    }

    const json = decodeURIComponent(atob(base64));
    return JSON.parse(json) as CanonicalQuery;
  } catch (error) {
    console.error('Failed to decode URL state:', error);
    return null;
  }
}

/**
 * Hook for bidirectional URL state synchronization
 */
export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { query, setQuery } = useQueryStore();

  // Load state from URL on mount
  useEffect(() => {
    const encodedQuery = searchParams.get('q');
    if (encodedQuery) {
      const decoded = decodeState(encodedQuery);
      if (decoded) {
        setQuery(decoded);
      }
    }
  }, []); // Only run on mount

  // Update URL when query changes
  useEffect(() => {
    if (query) {
      const encoded = encodeState(query);
      const currentEncoded = searchParams.get('q');
      if (encoded !== currentEncoded) {
        setSearchParams({ q: encoded }, { replace: true });
      }
    }
  }, [query, searchParams, setSearchParams]);

  // Generate shareable URL
  const getShareUrl = useCallback(() => {
    if (!query) return '';
    const encoded = encodeState(query);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/chart?q=${encoded}`;
  }, [query]);

  return {
    getShareUrl,
    encodeState,
    decodeState,
  };
}

/**
 * Tests for fetch service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry, fetchJson, fetchText, FetchError } from './fetch';

describe('fetch service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWithRetry', () => {
    it('should return response on successful fetch', async () => {
      const mockResponse = new Response('test data', { status: 200 });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry('https://api.example.com/data');

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on server error (5xx)', async () => {
      const errorResponse = new Response('error', { status: 500 });
      const successResponse = new Response('success', { status: 200 });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await fetchWithRetry('https://api.example.com/data', {
        retries: 2,
        retryDelay: 10,
      });

      expect(result).toBe(successResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw FetchError on client error (4xx)', async () => {
      const errorResponse = new Response('not found', { status: 404, statusText: 'Not Found' });
      vi.mocked(global.fetch).mockResolvedValueOnce(errorResponse);

      await expect(fetchWithRetry('https://api.example.com/data')).rejects.toThrow(
        FetchError
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit (429)', async () => {
      const rateLimitResponse = new Response('rate limited', { status: 429 });
      const successResponse = new Response('success', { status: 200 });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await fetchWithRetry('https://api.example.com/data', {
        retries: 2,
        retryDelay: 10,
      });

      expect(result).toBe(successResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on timeout', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          })
      );

      await expect(
        fetchWithRetry('https://api.example.com/data', {
          timeout: 100,
          retries: 0,
        })
      ).rejects.toThrow(FetchError);
    });
  });

  describe('fetchJson', () => {
    it('should parse JSON response', async () => {
      const data = { name: 'test', value: 123 };
      const mockResponse = new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await fetchJson('https://api.example.com/data');

      expect(result).toEqual(data);
    });
  });

  describe('fetchText', () => {
    it('should return text content', async () => {
      const text = 'Hello, World!';
      const mockResponse = new Response(text, { status: 200 });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await fetchText('https://api.example.com/text');

      expect(result).toBe(text);
    });
  });
});

/**
 * Fetch service with retry logic and error handling
 */

export interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public isCorsError?: boolean,
    public isTimeout?: boolean
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_TIMEOUT = 30000;

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic, timeout, and error classification
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeout = DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't retry on client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new FetchError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText
          );
        }

        // Retry on server errors (5xx) and rate limiting (429)
        if (attempt < retries) {
          const delay = response.status === 429
            ? retryDelay * Math.pow(2, attempt) // Exponential backoff for rate limits
            : retryDelay;
          await sleep(delay);
          continue;
        }

        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < retries) {
          await sleep(retryDelay);
          continue;
        }
        throw new FetchError('Request timed out', undefined, undefined, false, true);
      }

      // Handle network errors (likely CORS)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new FetchError(
          'Network error - possibly blocked by CORS',
          undefined,
          undefined,
          true
        );
      }

      // Already a FetchError, rethrow
      if (error instanceof FetchError) {
        throw error;
      }

      // Retry on other errors
      if (attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new FetchError('Request failed after retries');
}

/**
 * Fetch JSON with type checking
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  return response.json() as Promise<T>;
}

/**
 * Fetch text content (for CSV, etc.)
 */
export async function fetchText(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return response.text();
}

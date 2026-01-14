/**
 * Base adapter abstract class
 * Implements template method pattern for data fetching and normalization
 */

import { DataSourceConfig } from '../../types/source';
import { CanonicalQuery } from '../../types/query';
import { NormalizedDataset } from '../../types/dataset';
import { CatalogEntry } from '../../types/catalog';
import { cacheService } from '../../services/cache';
import { fetchWithRetry } from '../../services/fetch';

export interface FetchMetadata {
  queryUrl: string;
  retrievedAt: string;
}

export abstract class BaseAdapter {
  protected config: DataSourceConfig;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  /**
   * Get the source configuration
   */
  getConfig(): DataSourceConfig {
    return this.config;
  }

  /**
   * Get the source ID
   */
  getSourceId(): string {
    return this.config.id;
  }

  /**
   * Execute a query and return normalized data
   * Template method pattern - subclasses implement specific methods
   */
  async execute(query: CanonicalQuery): Promise<NormalizedDataset> {
    const url = this.buildUrl(query);
    const cacheKey = cacheService.getCacheKey(this.config.id, url);

    // Check cache first
    const cached = await cacheService.get<NormalizedDataset>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch data
    const response = await fetchWithRetry(url, {
      headers: this.getHeaders(),
    });

    // Parse response
    const rawData = await this.parseResponse(response);

    // Create metadata
    const metadata: FetchMetadata = {
      queryUrl: url,
      retrievedAt: new Date().toISOString(),
    };

    // Normalize to canonical format
    const normalized = this.normalize(rawData, query, metadata);

    // Cache the result
    await cacheService.set(cacheKey, normalized, this.getCacheTTL());

    return normalized;
  }

  /**
   * Build the URL for the query
   * Must be implemented by subclasses
   */
  abstract buildUrl(query: CanonicalQuery): string;

  /**
   * Parse the API response
   * Must be implemented by subclasses
   */
  abstract parseResponse(response: Response): Promise<unknown>;

  /**
   * Normalize raw data to canonical format
   * Must be implemented by subclasses
   */
  abstract normalize(
    rawData: unknown,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): NormalizedDataset;

  /**
   * Get HTTP headers for the request
   * Can be overridden by subclasses
   */
  protected getHeaders(): HeadersInit {
    return {
      Accept: 'application/json',
    };
  }

  /**
   * Get cache TTL in milliseconds
   * Can be overridden by subclasses
   */
  protected getCacheTTL(): number {
    return 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Search for indicators
   * Optional - subclasses can implement if the source supports it
   */
  async searchIndicators(_searchTerm: string): Promise<CatalogEntry[]> {
    throw new Error(`Indicator search not implemented for ${this.config.id}`);
  }

  /**
   * Get available countries/entities
   * Optional - subclasses can implement if the source supports it
   */
  async getEntities(): Promise<Array<{ id: string; label: string }>> {
    throw new Error(`Entity list not implemented for ${this.config.id}`);
  }
}

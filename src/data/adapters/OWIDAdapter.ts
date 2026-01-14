/**
 * Our World in Data adapter
 * Fetches CSV data from OWID GitHub repository
 */

import Papa from 'papaparse';
import { BaseAdapter, FetchMetadata } from './BaseAdapter';
import { owidConfig, owidDatasets } from '../registry/owid';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset, NormalizedDataset, DataPoint } from '../../types/dataset';
import { fetchText } from '../../services/fetch';

interface OWIDRow {
  Entity: string;
  Code?: string;
  Year: string;
  [key: string]: string | undefined;
}

export class OWIDAdapter extends BaseAdapter {
  constructor() {
    super(owidConfig);
  }

  /**
   * Build URL for OWID dataset
   */
  buildUrl(query: CanonicalQuery): string {
    const indicatorId = query.y[0].indicatorId;
    const dataset = owidDatasets[indicatorId];

    if (!dataset) {
      throw new Error(`Unknown OWID dataset: ${indicatorId}`);
    }

    return `${this.config.baseUrl}/datasets/${dataset.path}.csv`;
  }

  /**
   * Parse CSV response
   */
  async parseResponse(response: Response): Promise<OWIDRow[]> {
    const text = await response.text();

    const result = Papa.parse<OWIDRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    return result.data;
  }

  /**
   * Normalize OWID CSV data to canonical format
   */
  normalize(
    rawData: unknown,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): NormalizedDataset {
    const rows = rawData as OWIDRow[];
    const indicatorId = query.y[0].indicatorId;
    const dataset = owidDatasets[indicatorId];

    if (!dataset) {
      throw new Error(`Unknown OWID dataset: ${indicatorId}`);
    }

    const { start, end } = query.filters.timeRange;
    const startYear = parseInt(start);
    const endYear = parseInt(end);

    // Filter by entities and time range
    const entitySet = new Set(query.entities.map((e) => e.toUpperCase()));

    const filteredRows = rows.filter((row) => {
      const year = parseInt(row.Year);
      const code = row.Code?.toUpperCase() || '';
      const entity = row.Entity?.toUpperCase() || '';

      const yearInRange = year >= startYear && year <= endYear;
      const entityMatch =
        entitySet.has(code) || entitySet.has(entity) || entitySet.has(row.Entity || '');

      return yearInRange && entityMatch;
    });

    // Group by entity
    const seriesMap = new Map<string, { label: string; points: DataPoint[] }>();

    for (const row of filteredRows) {
      const entityId = row.Code || row.Entity;
      const entityLabel = row.Entity;
      const valueStr = row[dataset.valueColumn];
      const value = valueStr ? parseFloat(valueStr) : null;

      if (!seriesMap.has(entityId)) {
        seriesMap.set(entityId, { label: entityLabel, points: [] });
      }

      seriesMap.get(entityId)!.points.push({
        t: row.Year,
        v: isNaN(value as number) ? null : value,
      });
    }

    // Sort points by time
    for (const series of seriesMap.values()) {
      series.points.sort((a, b) => a.t.localeCompare(b.t));
    }

    return {
      kind: 'TimeSeriesDataset',
      series: Array.from(seriesMap.entries()).map(([entityId, { label, points }]) => ({
        entityId,
        entityLabel: label,
        indicatorId,
        indicatorLabel: query.y[0].label || indicatorId,
        points,
        unit: dataset.unit,
      })),
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    } as TimeSeriesDataset;
  }

  /**
   * Override execute to handle OWID's CSV format
   */
  async execute(query: CanonicalQuery): Promise<NormalizedDataset> {
    const url = this.buildUrl(query);
    const cacheKey = `${this.config.id}:${url}`;

    // Check cache
    const { cacheService } = await import('../../services/cache');
    const cached = await cacheService.get<NormalizedDataset>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch CSV
    const text = await fetchText(url);

    // Parse CSV
    const result = Papa.parse<OWIDRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const metadata: FetchMetadata = {
      queryUrl: url,
      retrievedAt: new Date().toISOString(),
    };

    const normalized = this.normalize(result.data, query, metadata);

    // Cache result
    await cacheService.set(cacheKey, normalized, this.getCacheTTL());

    return normalized;
  }

  /**
   * Get available OWID datasets
   */
  getAvailableDatasets(): string[] {
    return Object.keys(owidDatasets);
  }
}

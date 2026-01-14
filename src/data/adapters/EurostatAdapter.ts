/**
 * Eurostat data adapter
 * Uses Eurostat's JSON-stat format API
 */

import { BaseAdapter, FetchMetadata } from './BaseAdapter';
import { eurostatConfig } from '../registry/eurostat';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset, NormalizedDataset, DataPoint } from '../../types/dataset';

// Eurostat JSON-stat response structure
interface EurostatDimension {
  label: string;
  category: {
    index: Record<string, number>;
    label: Record<string, string>;
  };
}

interface EurostatResponse {
  version: string;
  label: string;
  source: string;
  updated: string;
  id: string[];
  size: number[];
  dimension: Record<string, EurostatDimension>;
  value: Record<string, number | null> | (number | null)[];
  status?: Record<string, string>;
}

export class EurostatAdapter extends BaseAdapter {
  constructor() {
    super(eurostatConfig);
  }

  /**
   * Build URL for Eurostat query
   * Eurostat uses a different query structure than World Bank
   */
  buildUrl(query: CanonicalQuery): string {
    const { y, entities, filters } = query;
    const datasetId = y[0].indicatorId;
    const { start, end } = filters.timeRange;

    // Build geo filter
    const geoFilter = entities.map((e) => `geo=${e}`).join('&');

    // Build time filter - Eurostat typically uses annual data
    const years: string[] = [];
    const startYear = parseInt(start);
    const endYear = parseInt(end);
    for (let year = startYear; year <= endYear; year++) {
      years.push(year.toString());
    }
    const timeFilter = years.map((y) => `time=${y}`).join('&');

    return `${this.config.baseUrl}/${datasetId}?format=JSON&lang=EN&${geoFilter}&${timeFilter}`;
  }

  /**
   * Parse Eurostat JSON-stat response
   */
  async parseResponse(response: Response): Promise<EurostatResponse> {
    const json = await response.json();

    if (!json.dimension || !json.value) {
      throw new Error('Invalid Eurostat response format');
    }

    return json as EurostatResponse;
  }

  /**
   * Normalize Eurostat JSON-stat data to canonical format
   */
  normalize(
    rawData: unknown,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): NormalizedDataset {
    const data = rawData as EurostatResponse;

    const timeSeries = this.parseJsonStat(data, query);

    return {
      kind: 'TimeSeriesDataset',
      series: timeSeries,
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
   * Parse JSON-stat format to series data
   */
  private parseJsonStat(
    data: EurostatResponse,
    query: CanonicalQuery
  ): TimeSeriesDataset['series'] {
    const dimensions = data.dimension;
    const values = data.value;

    // Get dimension indices
    const dimIds = data.id;
    const dimSizes = data.size;

    // Find geo and time dimensions
    const geoIdx = dimIds.indexOf('geo');
    const timeIdx = dimIds.indexOf('time');

    if (geoIdx === -1 || timeIdx === -1) {
      return [];
    }

    const geoDim = dimensions['geo'];
    const timeDim = dimensions['time'];

    // Calculate strides for multi-dimensional indexing
    const strides: number[] = [];
    let stride = 1;
    for (let i = dimSizes.length - 1; i >= 0; i--) {
      strides.unshift(stride);
      stride *= dimSizes[i];
    }

    // Build series for each geo
    const seriesMap = new Map<string, { label: string; points: DataPoint[] }>();

    const geoEntries = Object.entries(geoDim.category.index);
    const timeEntries = Object.entries(timeDim.category.index);

    for (const [geoCode, geoIndex] of geoEntries) {
      const geoLabel = geoDim.category.label[geoCode] || geoCode;

      if (!seriesMap.has(geoCode)) {
        seriesMap.set(geoCode, { label: geoLabel, points: [] });
      }

      for (const [timeCode, timeIndex] of timeEntries) {
        // Calculate flat index
        const indices = new Array(dimIds.length).fill(0);
        indices[geoIdx] = geoIndex;
        indices[timeIdx] = timeIndex;

        let flatIndex = 0;
        for (let i = 0; i < indices.length; i++) {
          flatIndex += indices[i] * strides[i];
        }

        // Get value
        let value: number | null = null;
        if (Array.isArray(values)) {
          value = values[flatIndex] ?? null;
        } else {
          value = values[flatIndex.toString()] ?? null;
        }

        seriesMap.get(geoCode)!.points.push({
          t: timeCode,
          v: value,
        });
      }
    }

    // Sort points by time and create final series
    return Array.from(seriesMap.entries()).map(([entityId, { label, points }]) => ({
      entityId,
      entityLabel: label,
      indicatorId: query.y[0].indicatorId,
      indicatorLabel: query.y[0].label || data.label,
      points: points.sort((a, b) => a.t.localeCompare(b.t)),
      unit: query.y[0].unit || '',
    }));
  }
}

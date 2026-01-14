/**
 * World Bank data adapter
 */

import { BaseAdapter, FetchMetadata } from './BaseAdapter';
import { worldbankConfig } from '../registry/worldbank';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset, CrossSectionDataset, NormalizedDataset, DataPoint } from '../../types/dataset';
import { CatalogEntry } from '../../types/catalog';
import { fetchJson } from '../../services/fetch';

// World Bank API response types
interface WorldBankMetadata {
  page: number;
  pages: number;
  per_page: string;
  total: number;
}

interface WorldBankDataPoint {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

interface WorldBankIndicator {
  id: string;
  name: string;
  unit: string;
  source: { id: string; value: string };
  sourceNote: string;
  sourceOrganization: string;
  topics: Array<{ id: string; value: string }>;
}

interface WorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
  capitalCity: string;
}

type WorldBankDataResponse = [WorldBankMetadata, WorldBankDataPoint[] | null];
type WorldBankIndicatorResponse = [WorldBankMetadata, WorldBankIndicator[] | null];
type WorldBankCountryResponse = [WorldBankMetadata, WorldBankCountry[] | null];

export class WorldBankAdapter extends BaseAdapter {
  constructor() {
    super(worldbankConfig);
  }

  /**
   * Build URL for the query
   */
  buildUrl(query: CanonicalQuery): string {
    const { entities, y, filters } = query;
    const countries = entities.join(';');
    const indicator = y[0].indicatorId;
    const { start, end } = filters.timeRange;

    return `${this.config.baseUrl}/country/${countries}/indicator/${indicator}?format=json&date=${start}:${end}&per_page=20000`;
  }

  /**
   * Parse World Bank API response
   */
  async parseResponse(response: Response): Promise<WorldBankDataResponse> {
    const json = await response.json();

    if (!Array.isArray(json) || json.length < 2) {
      throw new Error('Invalid World Bank response format');
    }

    return json as WorldBankDataResponse;
  }

  /**
   * Normalize World Bank data to canonical format
   */
  normalize(
    rawData: unknown,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): NormalizedDataset {
    const [_meta, dataPoints] = rawData as WorldBankDataResponse;

    if (!dataPoints || dataPoints.length === 0) {
      return this.createEmptyDataset(query, metadata);
    }

    if (query.queryType === 'cross_section') {
      return this.normalizeCrossSection(dataPoints, query, metadata);
    }

    return this.normalizeTimeSeries(dataPoints, query, metadata);
  }

  /**
   * Normalize to time series dataset
   */
  private normalizeTimeSeries(
    dataPoints: WorldBankDataPoint[],
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): TimeSeriesDataset {
    // Group by entity
    const seriesByEntity = new Map<
      string,
      { entityLabel: string; points: DataPoint[] }
    >();

    for (const point of dataPoints) {
      const entityId = point.countryiso3code || point.country.id;

      if (!seriesByEntity.has(entityId)) {
        seriesByEntity.set(entityId, {
          entityLabel: point.country.value,
          points: [],
        });
      }

      seriesByEntity.get(entityId)!.points.push({
        t: point.date,
        v: point.value,
      });
    }

    // Sort points by time
    for (const series of seriesByEntity.values()) {
      series.points.sort((a, b) => a.t.localeCompare(b.t));
    }

    const indicator = dataPoints[0].indicator;

    return {
      kind: 'TimeSeriesDataset',
      series: Array.from(seriesByEntity.entries()).map(([entityId, data]) => ({
        entityId,
        entityLabel: data.entityLabel,
        indicatorId: indicator.id,
        indicatorLabel: indicator.value,
        points: data.points,
        unit: query.y[0].unit || '',
      })),
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Normalize to cross section dataset
   */
  private normalizeCrossSection(
    dataPoints: WorldBankDataPoint[],
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): CrossSectionDataset {
    const indicator = dataPoints[0].indicator;
    const targetYear = query.filters.timeRange.end;

    // Get the most recent value for each entity
    const entityValues = new Map<
      string,
      { label: string; value: number | null; year: string }
    >();

    for (const point of dataPoints) {
      const entityId = point.countryiso3code || point.country.id;
      const existing = entityValues.get(entityId);

      if (!existing || point.date >= existing.year) {
        entityValues.set(entityId, {
          label: point.country.value,
          value: point.value,
          year: point.date,
        });
      }
    }

    return {
      kind: 'CrossSectionDataset',
      indicatorId: indicator.id,
      indicatorLabel: indicator.value,
      time: targetYear,
      rows: Array.from(entityValues.entries()).map(([entityId, data]) => ({
        entityId,
        entityLabel: data.label,
        value: data.value,
      })),
      unit: query.y[0].unit || '',
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Create empty dataset when no data is returned
   */
  private createEmptyDataset(
    _query: CanonicalQuery,
    metadata: FetchMetadata
  ): TimeSeriesDataset {
    return {
      kind: 'TimeSeriesDataset',
      series: [],
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Search for indicators
   */
  async searchIndicators(searchTerm: string): Promise<CatalogEntry[]> {
    const url = `${this.config.baseUrl}/indicator?format=json&per_page=100&source=2`;

    const response = await fetchJson<WorldBankIndicatorResponse>(url);
    const [_meta, indicators] = response;

    if (!indicators) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase();

    return indicators
      .filter(
        (ind) =>
          ind.name.toLowerCase().includes(searchLower) ||
          ind.id.toLowerCase().includes(searchLower)
      )
      .slice(0, 20)
      .map((ind) => ({
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        datasetId: 'indicators',
        indicatorId: ind.id,
        title: ind.name,
        description: ind.sourceNote || '',
        unit: ind.unit || '',
        topics: ind.topics?.map((t) => t.value) || [],
        geography: 'country' as const,
        exampleQuery: {
          queryType: 'time_series' as const,
          entities: ['DEU'],
          timeRange: { start: '2000', end: '2024' },
        },
      }));
  }

  /**
   * Get available countries
   */
  async getEntities(): Promise<Array<{ id: string; label: string }>> {
    const url = `${this.config.baseUrl}/country?format=json&per_page=300`;

    const response = await fetchJson<WorldBankCountryResponse>(url);
    const [_meta, countries] = response;

    if (!countries) {
      return [];
    }

    // Filter out aggregates (regions like "World", "Europe & Central Asia", etc.)
    return countries
      .filter((c) => c.region.id !== 'NA')
      .map((c) => ({
        id: c.id,
        label: c.name,
      }));
  }
}

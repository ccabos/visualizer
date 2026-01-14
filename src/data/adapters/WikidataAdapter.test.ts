/**
 * Tests for Wikidata adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikidataAdapter } from './WikidataAdapter';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset, CrossSectionDataset } from '../../types/dataset';

// Mock the services
vi.mock('../../services/fetch', () => ({
  fetchWithRetry: vi.fn(),
  fetchJson: vi.fn(),
}));

vi.mock('../../services/cache', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getCacheKey: vi.fn((sourceId, url) => `${sourceId}:${url}`),
  },
}));

describe('WikidataAdapter', () => {
  let adapter: WikidataAdapter;

  beforeEach(() => {
    adapter = new WikidataAdapter();
    vi.clearAllMocks();
  });

  describe('buildUrl', () => {
    it('should build correct SPARQL query URL for time series', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'wikidata',
        queryType: 'time_series',
        entities: ['DEU'],
        y: [{ indicatorId: 'wikidata:population', label: 'Population' }],
        filters: {
          timeRange: { start: '2000', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      const url = adapter.buildUrl(query);

      expect(url).toContain('query.wikidata.org');
      expect(url).toContain('/sparql');
      expect(url).toContain('format=json');
      expect(url).toContain('query=');
    });

    it('should include entity filter in query', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'wikidata',
        queryType: 'time_series',
        entities: ['DEU', 'FRA'],
        y: [{ indicatorId: 'wikidata:population', label: 'Population' }],
        filters: {
          timeRange: { start: '2000', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      const url = adapter.buildUrl(query);
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).toContain('"DEU"');
      expect(decodedUrl).toContain('"FRA"');
    });

    it('should throw error for unknown indicator', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'wikidata',
        queryType: 'time_series',
        entities: ['DEU'],
        y: [{ indicatorId: 'unknown:indicator', label: 'Unknown' }],
        filters: {
          timeRange: { start: '2000', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      expect(() => adapter.buildUrl(query)).toThrow('Unknown indicator');
    });
  });

  describe('buildSparqlQuery', () => {
    it('should build time series SPARQL query with date filter', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'wikidata',
        queryType: 'time_series',
        entities: ['DEU'],
        y: [{ indicatorId: 'wikidata:population', label: 'Population' }],
        filters: {
          timeRange: { start: '2000', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      const sparql = adapter.buildSparqlQuery(query);

      expect(sparql).toContain('SELECT');
      expect(sparql).toContain('?entity');
      expect(sparql).toContain('?entityLabel');
      expect(sparql).toContain('?date');
      expect(sparql).toContain('?value');
      expect(sparql).toContain('P1082'); // Population property
      expect(sparql).toContain('YEAR(?date) >= 2000');
      expect(sparql).toContain('YEAR(?date) <= 2020');
    });

    it('should build cross section SPARQL query', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'wikidata',
        queryType: 'cross_section',
        entities: ['ALL'],
        y: [{ indicatorId: 'wikidata:area', label: 'Area' }],
        filters: {
          timeRange: { start: '2023', end: '2023' },
        },
        render: { chartType: 'bar' },
      };

      const sparql = adapter.buildSparqlQuery(query);

      expect(sparql).toContain('SELECT');
      expect(sparql).toContain('P2046'); // Area property
      expect(sparql).toContain('DESC(?date)');
    });
  });

  describe('normalize', () => {
    const mockQuery: CanonicalQuery = {
      version: 1,
      sourceId: 'wikidata',
      queryType: 'time_series',
      entities: ['DEU'],
      y: [{ indicatorId: 'wikidata:population', label: 'Population', unit: '' }],
      filters: {
        timeRange: { start: '2020', end: '2022' },
      },
      render: { chartType: 'line' },
    };

    const mockMetadata = {
      queryUrl: 'https://query.wikidata.org/sparql?query=...',
      retrievedAt: '2025-01-14T10:00:00Z',
    };

    it('should normalize SPARQL response to TimeSeriesDataset', () => {
      const rawData = {
        head: { vars: ['entity', 'entityLabel', 'date', 'value'] },
        results: {
          bindings: [
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              date: { type: 'literal', value: '2022-01-01T00:00:00Z' },
              value: { type: 'literal', value: '83200000' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              date: { type: 'literal', value: '2021-01-01T00:00:00Z' },
              value: { type: 'literal', value: '83100000' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              date: { type: 'literal', value: '2020-01-01T00:00:00Z' },
              value: { type: 'literal', value: '83000000' },
            },
          ],
        },
      };

      const result = adapter.normalize(rawData, mockQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.kind).toBe('TimeSeriesDataset');
      expect(result.series).toHaveLength(1);
      expect(result.series[0].entityId).toBe('Q183');
      expect(result.series[0].entityLabel).toBe('Germany');
      expect(result.series[0].points).toHaveLength(3);

      // Points should be sorted by time
      expect(result.series[0].points[0].t).toBe('2020');
      expect(result.series[0].points[1].t).toBe('2021');
      expect(result.series[0].points[2].t).toBe('2022');

      // Check provenance
      expect(result.provenance.sourceId).toBe('wikidata');
      expect(result.provenance.sourceName).toBe('Wikidata');
    });

    it('should handle empty response', () => {
      const rawData = {
        head: { vars: ['entity', 'entityLabel', 'date', 'value'] },
        results: { bindings: [] },
      };

      const result = adapter.normalize(rawData, mockQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.kind).toBe('TimeSeriesDataset');
      expect(result.series).toHaveLength(0);
    });

    it('should group data by entity for multiple entities', () => {
      const multiEntityQuery = { ...mockQuery, entities: ['DEU', 'FRA'] };
      const rawData = {
        head: { vars: ['entity', 'entityLabel', 'date', 'value'] },
        results: {
          bindings: [
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              date: { type: 'literal', value: '2022-01-01T00:00:00Z' },
              value: { type: 'literal', value: '83200000' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q142' },
              entityLabel: { type: 'literal', value: 'France' },
              date: { type: 'literal', value: '2022-01-01T00:00:00Z' },
              value: { type: 'literal', value: '67800000' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              date: { type: 'literal', value: '2021-01-01T00:00:00Z' },
              value: { type: 'literal', value: '83100000' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q142' },
              entityLabel: { type: 'literal', value: 'France' },
              date: { type: 'literal', value: '2021-01-01T00:00:00Z' },
              value: { type: 'literal', value: '67700000' },
            },
          ],
        },
      };

      const result = adapter.normalize(rawData, multiEntityQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.series).toHaveLength(2);

      const germanySeries = result.series.find((s) => s.entityId === 'Q183');
      const franceSeries = result.series.find((s) => s.entityId === 'Q142');

      expect(germanySeries).toBeDefined();
      expect(franceSeries).toBeDefined();
      expect(germanySeries!.points).toHaveLength(2);
      expect(franceSeries!.points).toHaveLength(2);
    });

    it('should normalize cross section data', () => {
      const crossSectionQuery: CanonicalQuery = {
        ...mockQuery,
        queryType: 'cross_section',
      };

      const rawData = {
        head: { vars: ['entity', 'entityLabel', 'value', 'date'] },
        results: {
          bindings: [
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q183' },
              entityLabel: { type: 'literal', value: 'Germany' },
              value: { type: 'literal', value: '83200000' },
              date: { type: 'literal', value: '2022-01-01T00:00:00Z' },
            },
            {
              entity: { type: 'uri', value: 'http://www.wikidata.org/entity/Q142' },
              entityLabel: { type: 'literal', value: 'France' },
              value: { type: 'literal', value: '67800000' },
              date: { type: 'literal', value: '2022-01-01T00:00:00Z' },
            },
          ],
        },
      };

      const result = adapter.normalize(rawData, crossSectionQuery, mockMetadata) as CrossSectionDataset;

      expect(result.kind).toBe('CrossSectionDataset');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].entityId).toBe('Q183');
      expect(result.rows[0].entityLabel).toBe('Germany');
      expect(result.rows[0].value).toBe(83200000);
    });
  });

  describe('searchIndicators', () => {
    it('should return matching indicators', async () => {
      const results = await adapter.searchIndicators('population');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].indicatorId).toBe('wikidata:population');
      expect(results[0].sourceId).toBe('wikidata');
    });

    it('should return empty array for non-matching search', async () => {
      const results = await adapter.searchIndicators('nonexistent_indicator_xyz');

      expect(results).toHaveLength(0);
    });
  });

  describe('getConfig', () => {
    it('should return Wikidata configuration', () => {
      const config = adapter.getConfig();

      expect(config.id).toBe('wikidata');
      expect(config.displayName).toBe('Wikidata');
      expect(config.corsExpected).toBe(true);
    });
  });
});

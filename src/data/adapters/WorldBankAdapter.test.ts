/**
 * Tests for World Bank adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorldBankAdapter } from './WorldBankAdapter';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset } from '../../types/dataset';

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

describe('WorldBankAdapter', () => {
  let adapter: WorldBankAdapter;

  beforeEach(() => {
    adapter = new WorldBankAdapter();
    vi.clearAllMocks();
  });

  describe('buildUrl', () => {
    it('should build correct URL for single entity', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'worldbank',
        queryType: 'time_series',
        entities: ['DEU'],
        y: [{ indicatorId: 'NY.GDP.PCAP.CD', label: 'GDP per capita' }],
        filters: {
          timeRange: { start: '2000', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      const url = adapter.buildUrl(query);

      expect(url).toContain('api.worldbank.org');
      expect(url).toContain('/country/DEU/');
      expect(url).toContain('indicator/NY.GDP.PCAP.CD');
      expect(url).toContain('date=2000:2020');
      expect(url).toContain('format=json');
    });

    it('should build correct URL for multiple entities', () => {
      const query: CanonicalQuery = {
        version: 1,
        sourceId: 'worldbank',
        queryType: 'time_series',
        entities: ['DEU', 'FRA', 'USA'],
        y: [{ indicatorId: 'NY.GDP.PCAP.CD', label: 'GDP per capita' }],
        filters: {
          timeRange: { start: '2010', end: '2020' },
        },
        render: { chartType: 'line' },
      };

      const url = adapter.buildUrl(query);

      expect(url).toContain('/country/DEU;FRA;USA/');
    });
  });

  describe('normalize', () => {
    const mockQuery: CanonicalQuery = {
      version: 1,
      sourceId: 'worldbank',
      queryType: 'time_series',
      entities: ['DEU'],
      y: [{ indicatorId: 'NY.GDP.PCAP.CD', label: 'GDP per capita', unit: 'USD' }],
      filters: {
        timeRange: { start: '2020', end: '2022' },
      },
      render: { chartType: 'line' },
    };

    const mockMetadata = {
      queryUrl: 'https://api.worldbank.org/test',
      retrievedAt: '2025-01-13T10:00:00Z',
    };

    it('should normalize World Bank response to TimeSeriesDataset', () => {
      const rawData = [
        { page: 1, pages: 1, per_page: '50', total: 3 },
        [
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'DE', value: 'Germany' },
            countryiso3code: 'DEU',
            date: '2022',
            value: 48000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'DE', value: 'Germany' },
            countryiso3code: 'DEU',
            date: '2021',
            value: 46000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'DE', value: 'Germany' },
            countryiso3code: 'DEU',
            date: '2020',
            value: 45000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
        ],
      ];

      const result = adapter.normalize(rawData, mockQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.kind).toBe('TimeSeriesDataset');
      expect(result.series).toHaveLength(1);
      expect(result.series[0].entityId).toBe('DEU');
      expect(result.series[0].entityLabel).toBe('Germany');
      expect(result.series[0].points).toHaveLength(3);

      // Points should be sorted by time
      expect(result.series[0].points[0].t).toBe('2020');
      expect(result.series[0].points[1].t).toBe('2021');
      expect(result.series[0].points[2].t).toBe('2022');

      // Check provenance
      expect(result.provenance.sourceId).toBe('worldbank');
      expect(result.provenance.sourceName).toBe('World Bank Indicators');
    });

    it('should handle empty response', () => {
      const rawData = [{ page: 1, pages: 0, per_page: '50', total: 0 }, null];

      const result = adapter.normalize(rawData, mockQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.kind).toBe('TimeSeriesDataset');
      expect(result.series).toHaveLength(0);
    });

    it('should group data by entity for multiple entities', () => {
      const multiEntityQuery = { ...mockQuery, entities: ['DEU', 'FRA'] };
      const rawData = [
        { page: 1, pages: 1, per_page: '50', total: 4 },
        [
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'DE', value: 'Germany' },
            countryiso3code: 'DEU',
            date: '2022',
            value: 48000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'FR', value: 'France' },
            countryiso3code: 'FRA',
            date: '2022',
            value: 42000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'DE', value: 'Germany' },
            countryiso3code: 'DEU',
            date: '2021',
            value: 46000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
          {
            indicator: { id: 'NY.GDP.PCAP.CD', value: 'GDP per capita' },
            country: { id: 'FR', value: 'France' },
            countryiso3code: 'FRA',
            date: '2021',
            value: 40000,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
        ],
      ];

      const result = adapter.normalize(rawData, multiEntityQuery, mockMetadata) as TimeSeriesDataset;

      expect(result.series).toHaveLength(2);

      const deuSeries = result.series.find((s) => s.entityId === 'DEU');
      const fraSeries = result.series.find((s) => s.entityId === 'FRA');

      expect(deuSeries).toBeDefined();
      expect(fraSeries).toBeDefined();
      expect(deuSeries!.points).toHaveLength(2);
      expect(fraSeries!.points).toHaveLength(2);
    });
  });

  describe('getConfig', () => {
    it('should return World Bank configuration', () => {
      const config = adapter.getConfig();

      expect(config.id).toBe('worldbank');
      expect(config.displayName).toBe('World Bank Indicators');
      expect(config.corsExpected).toBe(true);
    });
  });
});

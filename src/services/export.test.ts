/**
 * Tests for export service
 */

import { describe, it, expect } from 'vitest';
import {
  datasetToCsv,
  generateShareUrl,
  parseShareUrl,
} from './export';
import { TimeSeriesDataset, CrossSectionDataset, ScatterDataset } from '../types/dataset';

describe('export service', () => {
  const mockProvenance = {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    queryUrl: 'https://api.worldbank.org/v2/test',
    retrievedAt: '2025-01-13T10:00:00Z',
    attribution: {
      text: 'Source: World Bank',
      license: 'CC BY 4.0',
    },
  };

  describe('datasetToCsv', () => {
    it('should convert TimeSeriesDataset to CSV', () => {
      const dataset: TimeSeriesDataset = {
        kind: 'TimeSeriesDataset',
        series: [
          {
            entityId: 'DEU',
            entityLabel: 'Germany',
            indicatorId: 'NY.GDP.PCAP.CD',
            indicatorLabel: 'GDP per capita',
            points: [
              { t: '2020', v: 45000 },
              { t: '2021', v: 46000 },
            ],
            unit: 'USD',
          },
        ],
        provenance: mockProvenance,
      };

      const csv = datasetToCsv(dataset);

      expect(csv).toContain('# Source: World Bank');
      expect(csv).toContain('Entity,EntityID,Indicator,Year,Value,Unit');
      expect(csv).toContain('"Germany","DEU","GDP per capita",2020,45000,"USD"');
      expect(csv).toContain('"Germany","DEU","GDP per capita",2021,46000,"USD"');
    });

    it('should convert CrossSectionDataset to CSV', () => {
      const dataset: CrossSectionDataset = {
        kind: 'CrossSectionDataset',
        indicatorId: 'NY.GDP.PCAP.CD',
        indicatorLabel: 'GDP per capita',
        time: '2022',
        rows: [
          { entityId: 'DEU', entityLabel: 'Germany', value: 45000 },
          { entityId: 'FRA', entityLabel: 'France', value: 40000 },
        ],
        unit: 'USD',
        provenance: mockProvenance,
      };

      const csv = datasetToCsv(dataset);

      expect(csv).toContain('Entity,EntityID,Value,Unit');
      expect(csv).toContain('"Germany","DEU",45000,"USD"');
      expect(csv).toContain('"France","FRA",40000,"USD"');
    });

    it('should convert ScatterDataset to CSV', () => {
      const dataset: ScatterDataset = {
        kind: 'ScatterDataset',
        time: '2022',
        x: { indicatorId: 'GDP', label: 'GDP per capita', unit: 'USD' },
        y: { indicatorId: 'LE', label: 'Life expectancy', unit: 'years' },
        points: [
          { entityId: 'DEU', entityLabel: 'Germany', x: 45000, y: 81 },
          { entityId: 'FRA', entityLabel: 'France', x: 40000, y: 82 },
        ],
        provenance: mockProvenance,
      };

      const csv = datasetToCsv(dataset);

      expect(csv).toContain('Entity,EntityID,GDP per capita,Life expectancy');
      expect(csv).toContain('"Germany","DEU",45000,81');
    });

    it('should handle null values', () => {
      const dataset: TimeSeriesDataset = {
        kind: 'TimeSeriesDataset',
        series: [
          {
            entityId: 'DEU',
            entityLabel: 'Germany',
            indicatorId: 'test',
            indicatorLabel: 'Test',
            points: [
              { t: '2020', v: null },
              { t: '2021', v: 100 },
            ],
            unit: '',
          },
        ],
        provenance: mockProvenance,
      };

      const csv = datasetToCsv(dataset);

      // Null values should be excluded
      expect(csv).not.toContain('2020');
      expect(csv).toContain('2021');
    });
  });

  describe('generateShareUrl / parseShareUrl', () => {
    it('should generate and parse share URL', () => {
      const state = {
        version: 1,
        sourceId: 'worldbank',
        entities: ['DEU', 'FRA'],
      };

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://example.com',
          pathname: '/visualizer/',
        },
        writable: true,
      });

      const url = generateShareUrl(state);

      expect(url).toContain('https://example.com/visualizer/');
      expect(url).toContain('#/chart?q=');

      // Extract the encoded part
      const encoded = url.split('q=')[1];
      const parsed = parseShareUrl(encoded);

      expect(parsed).toEqual(state);
    });

    it('should return null for invalid encoded string', () => {
      const result = parseShareUrl('invalid-base64!!!');
      expect(result).toBeNull();
    });
  });
});

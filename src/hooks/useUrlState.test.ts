/**
 * Tests for URL state hook
 */

import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './useUrlState';
import { CanonicalQuery } from '../types/query';

describe('URL state encoding', () => {
  const sampleQuery: CanonicalQuery = {
    version: 1,
    sourceId: 'worldbank',
    queryType: 'time_series',
    entities: ['DEU', 'FRA'],
    y: [{ indicatorId: 'NY.GDP.PCAP.CD', label: 'GDP per capita', unit: 'USD' }],
    filters: {
      timeRange: { start: '2000', end: '2020' },
    },
    render: { chartType: 'line' },
  };

  describe('encodeState', () => {
    it('should encode query state to URL-safe string', () => {
      const encoded = encodeState(sampleQuery);

      // Should not contain base64 special characters that need URL encoding
      expect(encoded).not.toMatch(/[+/=]/);

      // Should be a non-empty string
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should produce consistent encoding', () => {
      const encoded1 = encodeState(sampleQuery);
      const encoded2 = encodeState(sampleQuery);

      expect(encoded1).toBe(encoded2);
    });
  });

  describe('decodeState', () => {
    it('should decode URL-safe string back to query state', () => {
      const encoded = encodeState(sampleQuery);
      const decoded = decodeState(encoded);

      expect(decoded).toEqual(sampleQuery);
    });

    it('should return null for invalid encoding', () => {
      const result = decodeState('not-valid-base64!!!');
      expect(result).toBeNull();
    });

    it('should return null for corrupted data', () => {
      const result = decodeState('YWJjZGVm'); // valid base64 but not valid JSON
      expect(result).toBeNull();
    });
  });

  describe('round-trip encoding', () => {
    it('should preserve all query fields', () => {
      const complexQuery: CanonicalQuery = {
        version: 1,
        sourceId: 'eurostat',
        queryType: 'scatter',
        title: 'GDP vs Life Expectancy',
        entities: ['DE', 'FR', 'IT', 'ES', 'PL'],
        y: [
          { indicatorId: 'ind1', label: 'Indicator 1', unit: '%' },
        ],
        filters: {
          timeRange: { start: '1990', end: '2023' },
          topN: 10,
        },
        render: {
          chartType: 'scatter',
          logScaleY: true,
        },
      };

      const encoded = encodeState(complexQuery);
      const decoded = decodeState(encoded);

      expect(decoded).toEqual(complexQuery);
    });

    it('should handle special characters in labels', () => {
      const queryWithSpecialChars: CanonicalQuery = {
        version: 1,
        sourceId: 'worldbank',
        queryType: 'time_series',
        title: 'CO₂ emissions & GDP/capita',
        entities: ['DEU'],
        y: [{ indicatorId: 'test', label: 'Test with "quotes" and <brackets>' }],
        filters: { timeRange: { start: '2000', end: '2020' } },
        render: { chartType: 'line' },
      };

      const encoded = encodeState(queryWithSpecialChars);
      const decoded = decodeState(encoded);

      expect(decoded?.title).toBe(queryWithSpecialChars.title);
      expect(decoded?.y[0].label).toBe(queryWithSpecialChars.y[0].label);
    });
  });
});

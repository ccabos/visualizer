/**
 * Tests for curated indicators catalog
 */

import { describe, it, expect } from 'vitest';
import {
  curatedIndicators,
  getAvailableTopics,
  searchCatalog,
} from './curated-indicators';

describe('curatedIndicators catalog', () => {
  describe('curatedIndicators', () => {
    it('should have indicators from multiple sources', () => {
      const sources = new Set(curatedIndicators.map((ind) => ind.sourceId));
      expect(sources.has('worldbank')).toBe(true);
      expect(sources.has('owid')).toBe(true);
      expect(sources.has('eurostat')).toBe(true);
    });

    it('should have required fields for each indicator', () => {
      for (const indicator of curatedIndicators) {
        expect(indicator.sourceId).toBeTruthy();
        expect(indicator.indicatorId).toBeTruthy();
        expect(indicator.title).toBeTruthy();
        expect(Array.isArray(indicator.topics)).toBe(true);
        expect(indicator.topics.length).toBeGreaterThan(0);
      }
    });

    it('should have unique indicator IDs per source', () => {
      const seen = new Set<string>();
      for (const indicator of curatedIndicators) {
        const key = `${indicator.sourceId}:${indicator.indicatorId}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('getAvailableTopics', () => {
    it('should return array of unique topics', () => {
      const topics = getAvailableTopics();

      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueTopics = new Set(topics);
      expect(uniqueTopics.size).toBe(topics.length);
    });

    it('should return sorted topics', () => {
      const topics = getAvailableTopics();
      const sortedTopics = [...topics].sort();
      expect(topics).toEqual(sortedTopics);
    });

    it('should include common topics', () => {
      const topics = getAvailableTopics();
      expect(topics).toContain('economy');
      expect(topics).toContain('health');
      expect(topics).toContain('energy');
    });
  });

  describe('searchCatalog', () => {
    it('should search by title', () => {
      const results = searchCatalog('GDP');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.title.toLowerCase().includes('gdp'))).toBe(
        true
      );
    });

    it('should search by indicator ID', () => {
      const results = searchCatalog('NY.GDP');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.indicatorId.includes('NY.GDP'))).toBe(true);
    });

    it('should search by topic', () => {
      const results = searchCatalog('energy');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.topics.some((t) => t.includes('energy')))).toBe(
        true
      );
    });

    it('should filter by source', () => {
      const results = searchCatalog('', { sourceId: 'worldbank' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.sourceId === 'worldbank')).toBe(true);
    });

    it('should filter by topics', () => {
      const results = searchCatalog('', { topics: ['health'] });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.topics.includes('health'))).toBe(true);
    });

    it('should combine search and filters', () => {
      const results = searchCatalog('capita', {
        sourceId: 'worldbank',
        topics: ['economy'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (r) =>
            r.sourceId === 'worldbank' &&
            r.topics.includes('economy') &&
            r.title.toLowerCase().includes('capita')
        )
      ).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = searchCatalog('xyznonexistent12345');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const results1 = searchCatalog('GDP');
      const results2 = searchCatalog('gdp');
      const results3 = searchCatalog('Gdp');

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });
  });
});

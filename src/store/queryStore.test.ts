/**
 * Tests for query store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useQueryStore } from './queryStore';

describe('queryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useQueryStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have null query initially', () => {
      const { query } = useQueryStore.getState();
      expect(query).toBeNull();
    });

    it('should not be loading initially', () => {
      const { isLoading } = useQueryStore.getState();
      expect(isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { error } = useQueryStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('createQuery', () => {
    it('should create a valid query', () => {
      const { createQuery } = useQueryStore.getState();

      const query = createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'NY.GDP.PCAP.CD',
        indicatorLabel: 'GDP per capita',
        entities: ['DEU', 'FRA'],
        startYear: '2000',
        endYear: '2020',
        chartType: 'line',
        unit: 'USD',
      });

      expect(query.version).toBe(1);
      expect(query.sourceId).toBe('worldbank');
      expect(query.queryType).toBe('time_series');
      expect(query.entities).toEqual(['DEU', 'FRA']);
      expect(query.y[0].indicatorId).toBe('NY.GDP.PCAP.CD');
      expect(query.filters.timeRange).toEqual({ start: '2000', end: '2020' });
      expect(query.render.chartType).toBe('line');
    });

    it('should set the query in store', () => {
      const { createQuery } = useQueryStore.getState();

      createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'test',
        indicatorLabel: 'Test',
        entities: ['DEU'],
        startYear: '2020',
        endYear: '2023',
        chartType: 'bar',
      });

      const { query } = useQueryStore.getState();
      expect(query).not.toBeNull();
      expect(query?.render.chartType).toBe('bar');
    });
  });

  describe('updateEntities', () => {
    it('should update entities in existing query', () => {
      const { createQuery, updateEntities } = useQueryStore.getState();

      createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'test',
        indicatorLabel: 'Test',
        entities: ['DEU'],
        startYear: '2020',
        endYear: '2023',
        chartType: 'line',
      });

      updateEntities(['USA', 'GBR', 'JPN']);

      const { query } = useQueryStore.getState();
      expect(query?.entities).toEqual(['USA', 'GBR', 'JPN']);
    });

    it('should do nothing if no query exists', () => {
      const { updateEntities } = useQueryStore.getState();

      updateEntities(['DEU']);

      const { query } = useQueryStore.getState();
      expect(query).toBeNull();
    });
  });

  describe('updateTimeRange', () => {
    it('should update time range in existing query', () => {
      const { createQuery, updateTimeRange } = useQueryStore.getState();

      createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'test',
        indicatorLabel: 'Test',
        entities: ['DEU'],
        startYear: '2000',
        endYear: '2020',
        chartType: 'line',
      });

      updateTimeRange('1990', '2023');

      const { query } = useQueryStore.getState();
      expect(query?.filters.timeRange).toEqual({ start: '1990', end: '2023' });
    });
  });

  describe('updateChartType', () => {
    it('should update chart type in existing query', () => {
      const { createQuery, updateChartType } = useQueryStore.getState();

      createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'test',
        indicatorLabel: 'Test',
        entities: ['DEU'],
        startYear: '2020',
        endYear: '2023',
        chartType: 'line',
      });

      updateChartType('bar');

      const { query } = useQueryStore.getState();
      expect(query?.render.chartType).toBe('bar');
    });
  });

  describe('setLoading / setError', () => {
    it('should set loading state', () => {
      const { setLoading } = useQueryStore.getState();

      setLoading(true);
      expect(useQueryStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useQueryStore.getState().isLoading).toBe(false);
    });

    it('should set error and clear loading', () => {
      const { setLoading, setError } = useQueryStore.getState();

      setLoading(true);
      setError('Something went wrong');

      const state = useQueryStore.getState();
      expect(state.error).toBe('Something went wrong');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { createQuery, setLoading, setError, reset } = useQueryStore.getState();

      createQuery({
        sourceId: 'worldbank',
        queryType: 'time_series',
        indicatorId: 'test',
        indicatorLabel: 'Test',
        entities: ['DEU'],
        startYear: '2020',
        endYear: '2023',
        chartType: 'line',
      });
      setLoading(true);
      setError('Error');

      reset();

      const state = useQueryStore.getState();
      expect(state.query).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

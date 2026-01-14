/**
 * Query state store using Zustand
 */

import { create } from 'zustand';
import { CanonicalQuery, ChartType, QueryType, QUERY_VERSION } from '../types/query';

interface QueryState {
  query: CanonicalQuery | null;
  isLoading: boolean;
  error: string | null;
}

interface QueryActions {
  setQuery: (query: CanonicalQuery) => void;
  updateSource: (sourceId: string) => void;
  updateIndicator: (indicatorId: string, label: string, unit?: string) => void;
  updateEntities: (entities: string[]) => void;
  updateTimeRange: (start: string, end: string) => void;
  updateChartType: (chartType: ChartType) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  createQuery: (params: CreateQueryParams) => CanonicalQuery;
}

interface CreateQueryParams {
  sourceId: string;
  queryType: QueryType;
  indicatorId: string;
  indicatorLabel: string;
  entities: string[];
  startYear: string;
  endYear: string;
  chartType: ChartType;
  unit?: string;
}

const initialState: QueryState = {
  query: null,
  isLoading: false,
  error: null,
};

export const useQueryStore = create<QueryState & QueryActions>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query, error: null }),

  updateSource: (sourceId) =>
    set((state) => ({
      query: state.query ? { ...state.query, sourceId } : null,
    })),

  updateIndicator: (indicatorId, label, unit) =>
    set((state) => ({
      query: state.query
        ? {
            ...state.query,
            y: [{ indicatorId, label, unit }],
          }
        : null,
    })),

  updateEntities: (entities) =>
    set((state) => ({
      query: state.query ? { ...state.query, entities } : null,
    })),

  updateTimeRange: (start, end) =>
    set((state) => ({
      query: state.query
        ? {
            ...state.query,
            filters: { ...state.query.filters, timeRange: { start, end } },
          }
        : null,
    })),

  updateChartType: (chartType) =>
    set((state) => ({
      query: state.query
        ? {
            ...state.query,
            render: { ...state.query.render, chartType },
          }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),

  createQuery: (params) => {
    const query: CanonicalQuery = {
      version: QUERY_VERSION,
      sourceId: params.sourceId,
      queryType: params.queryType,
      entities: params.entities,
      y: [
        {
          indicatorId: params.indicatorId,
          label: params.indicatorLabel,
          unit: params.unit,
        },
      ],
      filters: {
        timeRange: {
          start: params.startYear,
          end: params.endYear,
        },
      },
      render: {
        chartType: params.chartType,
      },
    };
    set({ query, error: null });
    return query;
  },
}));

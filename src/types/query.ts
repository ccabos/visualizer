/**
 * Canonical query object types
 */

export interface CanonicalQuery {
  version: number;
  sourceId: string;
  queryType: QueryType;
  title?: string;
  entities: string[];
  x?: AxisConfig;
  y: IndicatorConfig[];
  filters: QueryFilters;
  render: RenderConfig;
}

export type QueryType = 'time_series' | 'cross_section' | 'scatter' | 'ranking';

export interface AxisConfig {
  field: string;
}

export interface IndicatorConfig {
  indicatorId: string;
  label: string;
  unit?: string;
}

export interface QueryFilters {
  timeRange: TimeRange;
  regionFilter?: string;
  topN?: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface RenderConfig {
  chartType: ChartType;
  stack?: boolean;
  logScaleY?: boolean;
}

export type ChartType = 'line' | 'bar' | 'scatter';

/**
 * URL state encoding version
 */
export const QUERY_VERSION = 1;

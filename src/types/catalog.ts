/**
 * Catalog entry types for dataset discovery
 */

export interface CatalogEntry {
  sourceId: string;
  sourceName: string;
  datasetId: string;
  indicatorId: string;
  title: string;
  description: string;
  unit: string;
  topics: string[];
  geography: GeographyType;
  timeCoverage?: TimeCoverage;
  exampleQuery?: ExampleQuery;
}

export type GeographyType = 'country' | 'region' | 'global' | 'city';

export interface TimeCoverage {
  start: string;
  end: string;
}

export interface ExampleQuery {
  queryType: 'time_series' | 'cross_section' | 'scatter' | 'ranking';
  entities: string[];
  timeRange: TimeCoverage;
}

export interface CatalogSearchOptions {
  searchTerm?: string;
  topics?: string[];
  sourceId?: string;
  geography?: GeographyType;
}

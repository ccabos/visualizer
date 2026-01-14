/**
 * Data source registry type definitions
 */

export interface DataSourceConfig {
  id: string;
  displayName: string;
  homepage: string;
  baseUrl: string;
  corsExpected: boolean;
  auth: AuthConfig;
  formats: DataFormat[];
  endpoints: Record<string, EndpointConfig>;
  parsing: ParsingConfig;
  attribution: AttributionConfig;
  rateLimitNotes?: string;
}

export type AuthConfig =
  | { mode: 'none' }
  | { mode: 'apiKey'; headerName: string; envVar: string };

export type DataFormat = 'json' | 'csv' | 'jsonstat' | 'sdmx';

export interface EndpointConfig {
  pathTemplate: string;
  method: 'GET' | 'POST';
  params: Record<string, ParamConfig>;
  responseType?: 'json' | 'text';
}

export interface ParamConfig {
  fixed?: string | number;
  default?: string | number;
  example?: string;
  required?: boolean;
}

export interface ParsingConfig {
  type: ParsingType;
  timeField?: string;
  valueField?: string;
  entityField?: string;
}

export type ParsingType =
  | 'worldbank-json-v2'
  | 'eurostat-jsonstat'
  | 'csv-owid'
  | 'ember-csv'
  | 'overpass-json';

export interface AttributionConfig {
  text: string;
  license: string;
  url?: string;
}

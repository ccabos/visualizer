/**
 * World Bank data source configuration
 */

import { DataSourceConfig } from '../../types/source';

export const worldbankConfig: DataSourceConfig = {
  id: 'worldbank',
  displayName: 'World Bank Indicators',
  homepage: 'https://data.worldbank.org/',
  baseUrl: 'https://api.worldbank.org/v2',
  corsExpected: true,
  auth: { mode: 'none' },
  formats: ['json'],
  rateLimitNotes: 'Unspecified; handle with caching and retries.',
  endpoints: {
    indicatorSearch: {
      pathTemplate: '/indicator',
      method: 'GET',
      params: {
        format: { fixed: 'json' },
        per_page: { default: 50 },
        page: { default: 1 },
      },
    },
    indicatorData: {
      pathTemplate: '/country/{countries}/indicator/{indicator}',
      method: 'GET',
      params: {
        format: { fixed: 'json' },
        date: { example: '2000:2024' },
        per_page: { default: 20000 },
      },
    },
    countries: {
      pathTemplate: '/country',
      method: 'GET',
      params: {
        format: { fixed: 'json' },
        per_page: { default: 300 },
      },
    },
  },
  parsing: {
    type: 'worldbank-json-v2',
    timeField: 'date',
    valueField: 'value',
    entityField: 'country.id',
  },
  attribution: {
    text: 'Source: World Bank',
    license: 'CC BY 4.0',
    url: 'https://datacatalog.worldbank.org/public-licenses',
  },
};

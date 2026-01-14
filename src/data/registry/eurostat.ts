/**
 * Eurostat data source configuration
 */

import { DataSourceConfig } from '../../types/source';

export const eurostatConfig: DataSourceConfig = {
  id: 'eurostat',
  displayName: 'Eurostat',
  homepage: 'https://ec.europa.eu/eurostat',
  baseUrl: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data',
  corsExpected: true,
  auth: { mode: 'none' },
  formats: ['json'],
  rateLimitNotes: 'Generous limits; large responses possible.',
  endpoints: {
    datasetData: {
      pathTemplate: '/{datasetId}',
      method: 'GET',
      params: {
        format: { fixed: 'JSON' },
        lang: { default: 'EN' },
      },
    },
  },
  parsing: {
    type: 'eurostat-jsonstat',
  },
  attribution: {
    text: 'Source: Eurostat',
    license: 'Eurostat copyright policy',
    url: 'https://ec.europa.eu/eurostat/web/main/about-us/policies/copyright',
  },
};

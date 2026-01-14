/**
 * Our World in Data source configuration
 */

import { DataSourceConfig } from '../../types/source';

export const owidConfig: DataSourceConfig = {
  id: 'owid',
  displayName: 'Our World in Data',
  homepage: 'https://ourworldindata.org/',
  baseUrl: 'https://raw.githubusercontent.com/owid/owid-datasets/master',
  corsExpected: true,
  auth: { mode: 'none' },
  formats: ['csv'],
  rateLimitNotes: 'GitHub raw has rate limits, but generous for read-only.',
  endpoints: {
    datasetData: {
      pathTemplate: '/datasets/{datasetPath}/{datasetName}.csv',
      method: 'GET',
      responseType: 'text',
      params: {},
    },
  },
  parsing: {
    type: 'csv-owid',
    timeField: 'Year',
    valueField: '', // varies by dataset
    entityField: 'Entity',
  },
  attribution: {
    text: 'Source: Our World in Data',
    license: 'CC BY',
    url: 'https://ourworldindata.org/about#legal',
  },
};

/**
 * Curated OWID datasets with known URLs
 */
export const owidDatasets: Record<string, { path: string; valueColumn: string; unit: string }> = {
  'life-expectancy': {
    path: 'Life%20expectancy/Life%20expectancy',
    valueColumn: 'Life expectancy (years)',
    unit: 'years',
  },
  'co2-emissions': {
    path: 'CO%E2%82%82%20emissions/CO%E2%82%82%20emissions',
    valueColumn: 'Annual CO₂ emissions',
    unit: 'tonnes',
  },
  'gdp-per-capita': {
    path: 'GDP%20per%20capita%20-%20Maddison%20Project%20Database%202020/GDP%20per%20capita%20-%20Maddison%20Project%20Database%202020',
    valueColumn: 'GDP per capita',
    unit: 'international-$',
  },
  'energy-consumption': {
    path: 'Primary%20energy%20consumption/Primary%20energy%20consumption',
    valueColumn: 'Primary energy consumption (TWh)',
    unit: 'TWh',
  },
  'renewable-energy-share': {
    path: 'Share%20of%20electricity%20from%20renewables/Share%20of%20electricity%20from%20renewables',
    valueColumn: 'Renewables (% electricity)',
    unit: '%',
  },
};

/**
 * Curated starter catalog of indicators
 */

import { CatalogEntry } from '../../types/catalog';

export const curatedIndicators: CatalogEntry[] = [
  // World Bank - Economics
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'NY.GDP.PCAP.CD',
    title: 'GDP per capita (current US$)',
    description: 'GDP per capita is gross domestic product divided by midyear population.',
    unit: 'current US$',
    topics: ['economy', 'macroeconomics'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'FRA', 'USA'],
      timeRange: { start: '2000', end: '2023' },
    },
  },
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'FP.CPI.TOTL.ZG',
    title: 'Inflation, consumer prices (annual %)',
    description: 'Inflation as measured by the consumer price index.',
    unit: '%',
    topics: ['economy', 'prices'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'USA'],
      timeRange: { start: '2010', end: '2023' },
    },
  },
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'SL.UEM.TOTL.ZS',
    title: 'Unemployment, total (% of total labor force)',
    description: 'Unemployment refers to the share of the labor force that is without work.',
    unit: '%',
    topics: ['economy', 'labor'],
    geography: 'country',
    timeCoverage: { start: '1991', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'FRA', 'ESP'],
      timeRange: { start: '2000', end: '2023' },
    },
  },

  // World Bank - Health
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'SP.DYN.LE00.IN',
    title: 'Life expectancy at birth, total (years)',
    description: 'Life expectancy at birth indicates the number of years a newborn infant would live.',
    unit: 'years',
    topics: ['health', 'demographics'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'JPN', 'USA'],
      timeRange: { start: '1990', end: '2022' },
    },
  },
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'SP.DYN.IMRT.IN',
    title: 'Mortality rate, infant (per 1,000 live births)',
    description: 'Infant mortality rate is the number of infants dying before reaching one year of age.',
    unit: 'per 1,000 live births',
    topics: ['health', 'demographics'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'IND', 'NGA'],
      timeRange: { start: '1990', end: '2022' },
    },
  },

  // World Bank - Energy
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'EG.USE.ELEC.KH.PC',
    title: 'Electric power consumption (kWh per capita)',
    description: 'Electric power consumption measures the production of power plants and combined heat and power plants.',
    unit: 'kWh per capita',
    topics: ['energy', 'infrastructure'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2014' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'CHN', 'USA'],
      timeRange: { start: '1990', end: '2014' },
    },
  },
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'EG.FEC.RNEW.ZS',
    title: 'Renewable energy consumption (% of total)',
    description: 'Renewable energy consumption is the share of renewable energy in total final energy consumption.',
    unit: '%',
    topics: ['energy', 'environment'],
    geography: 'country',
    timeCoverage: { start: '1990', end: '2021' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'DNK', 'USA'],
      timeRange: { start: '2000', end: '2021' },
    },
  },

  // World Bank - Environment
  {
    sourceId: 'worldbank',
    sourceName: 'World Bank Indicators',
    datasetId: 'indicators',
    indicatorId: 'EN.ATM.CO2E.PC',
    title: 'CO2 emissions (metric tons per capita)',
    description: 'Carbon dioxide emissions are those stemming from the burning of fossil fuels.',
    unit: 'metric tons per capita',
    topics: ['environment', 'climate'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2020' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'CHN', 'USA', 'IND'],
      timeRange: { start: '1990', end: '2020' },
    },
  },

  // OWID Datasets
  {
    sourceId: 'owid',
    sourceName: 'Our World in Data',
    datasetId: 'owid',
    indicatorId: 'life-expectancy',
    title: 'Life expectancy',
    description: 'Period life expectancy at birth, measured in years.',
    unit: 'years',
    topics: ['health', 'demographics'],
    geography: 'country',
    timeCoverage: { start: '1543', end: '2021' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['Germany', 'France', 'United States'],
      timeRange: { start: '1950', end: '2021' },
    },
  },
  {
    sourceId: 'owid',
    sourceName: 'Our World in Data',
    datasetId: 'owid',
    indicatorId: 'renewable-energy-share',
    title: 'Share of electricity from renewables',
    description: 'Share of electricity production from renewable sources.',
    unit: '%',
    topics: ['energy', 'environment'],
    geography: 'country',
    timeCoverage: { start: '1965', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['Germany', 'Denmark', 'United States'],
      timeRange: { start: '2000', end: '2022' },
    },
  },
  {
    sourceId: 'owid',
    sourceName: 'Our World in Data',
    datasetId: 'owid',
    indicatorId: 'energy-consumption',
    title: 'Primary energy consumption',
    description: 'Primary energy consumption, measured in terawatt-hours.',
    unit: 'TWh',
    topics: ['energy'],
    geography: 'country',
    timeCoverage: { start: '1965', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['Germany', 'China', 'United States'],
      timeRange: { start: '1990', end: '2022' },
    },
  },

  // Eurostat
  {
    sourceId: 'eurostat',
    sourceName: 'Eurostat',
    datasetId: 'eurostat',
    indicatorId: 'nama_10_gdp',
    title: 'GDP and main components',
    description: 'Gross domestic product at market prices for EU countries.',
    unit: 'million EUR',
    topics: ['economy', 'macroeconomics'],
    geography: 'country',
    timeCoverage: { start: '1975', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DE', 'FR', 'IT'],
      timeRange: { start: '2000', end: '2023' },
    },
  },
  {
    sourceId: 'eurostat',
    sourceName: 'Eurostat',
    datasetId: 'eurostat',
    indicatorId: 'nrg_bal_c',
    title: 'Energy balances',
    description: 'Complete energy balances for EU countries.',
    unit: 'TJ',
    topics: ['energy'],
    geography: 'country',
    timeCoverage: { start: '1990', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DE', 'FR'],
      timeRange: { start: '2010', end: '2022' },
    },
  },

  // Wikidata
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:population',
    title: 'Population',
    description: 'Total population of countries from Wikidata.',
    unit: '',
    topics: ['demographics', 'society'],
    geography: 'country',
    timeCoverage: { start: '1900', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'FRA', 'USA'],
      timeRange: { start: '2000', end: '2023' },
    },
  },
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:gdp',
    title: 'GDP (nominal)',
    description: 'Gross domestic product in nominal terms from Wikidata.',
    unit: 'USD',
    topics: ['economy', 'macroeconomics'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'FRA', 'USA'],
      timeRange: { start: '2000', end: '2023' },
    },
  },
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:gdp_per_capita',
    title: 'GDP per capita',
    description: 'Gross domestic product per capita from Wikidata.',
    unit: 'USD',
    topics: ['economy', 'macroeconomics'],
    geography: 'country',
    timeCoverage: { start: '1960', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'FRA', 'USA'],
      timeRange: { start: '2000', end: '2023' },
    },
  },
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:life_expectancy',
    title: 'Life expectancy',
    description: 'Life expectancy at birth from Wikidata.',
    unit: 'years',
    topics: ['health', 'demographics'],
    geography: 'country',
    timeCoverage: { start: '1950', end: '2023' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'JPN', 'USA'],
      timeRange: { start: '1990', end: '2023' },
    },
  },
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:hdi',
    title: 'Human Development Index',
    description: 'Human Development Index (HDI) from Wikidata.',
    unit: '',
    topics: ['development', 'society'],
    geography: 'country',
    timeCoverage: { start: '1990', end: '2022' },
    exampleQuery: {
      queryType: 'time_series',
      entities: ['DEU', 'NOR', 'USA'],
      timeRange: { start: '2000', end: '2022' },
    },
  },
  {
    sourceId: 'wikidata',
    sourceName: 'Wikidata',
    datasetId: 'wikidata',
    indicatorId: 'wikidata:area',
    title: 'Area',
    description: 'Total area of countries from Wikidata.',
    unit: 'km²',
    topics: ['geography'],
    geography: 'country',
    exampleQuery: {
      queryType: 'cross_section',
      entities: ['ALL'],
      timeRange: { start: '2023', end: '2023' },
    },
  },
];

/**
 * Get all unique topics from the catalog
 */
export function getAvailableTopics(): string[] {
  const topicSet = new Set<string>();
  for (const entry of curatedIndicators) {
    for (const topic of entry.topics) {
      topicSet.add(topic);
    }
  }
  return Array.from(topicSet).sort();
}

/**
 * Search the catalog
 */
export function searchCatalog(
  searchTerm: string,
  options?: { sourceId?: string; topics?: string[] }
): CatalogEntry[] {
  const term = searchTerm.toLowerCase();

  return curatedIndicators.filter((entry) => {
    // Filter by source if specified
    if (options?.sourceId && entry.sourceId !== options.sourceId) {
      return false;
    }

    // Filter by topics if specified
    if (options?.topics && options.topics.length > 0) {
      const hasMatchingTopic = options.topics.some((t) =>
        entry.topics.includes(t)
      );
      if (!hasMatchingTopic) {
        return false;
      }
    }

    // Search in title, description, indicator ID
    return (
      entry.title.toLowerCase().includes(term) ||
      entry.description.toLowerCase().includes(term) ||
      entry.indicatorId.toLowerCase().includes(term) ||
      entry.topics.some((t) => t.toLowerCase().includes(term))
    );
  });
}

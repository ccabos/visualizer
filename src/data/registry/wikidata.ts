/**
 * Wikidata data source configuration
 */

import { DataSourceConfig } from '../../types/source';

export const wikidataConfig: DataSourceConfig = {
  id: 'wikidata',
  displayName: 'Wikidata',
  homepage: 'https://www.wikidata.org/',
  baseUrl: 'https://query.wikidata.org',
  corsExpected: true,
  auth: { mode: 'none' },
  formats: ['json'],
  rateLimitNotes: 'Rate limited. User-Agent required. Respect query timeouts.',
  endpoints: {
    sparql: {
      pathTemplate: '/sparql',
      method: 'GET',
      params: {
        format: { fixed: 'json' },
        query: { required: true },
      },
    },
    entitySearch: {
      pathTemplate: '/w/api.php',
      method: 'GET',
      params: {
        action: { fixed: 'wbsearchentities' },
        format: { fixed: 'json' },
        language: { default: 'en' },
        search: { required: true },
        type: { default: 'item' },
        limit: { default: 10 },
      },
    },
  },
  parsing: {
    type: 'sparql-json',
    timeField: 'date',
    valueField: 'value',
    entityField: 'entity',
  },
  attribution: {
    text: 'Source: Wikidata',
    license: 'CC0',
    url: 'https://www.wikidata.org/wiki/Wikidata:Licensing',
  },
};

/**
 * Common Wikidata property IDs
 */
export const WikidataProperties = {
  // Demographic
  population: 'P1082',
  lifeExpectancy: 'P2250',
  humanDevelopmentIndex: 'P1081',

  // Economic
  gdp: 'P2131',
  gdpPerCapita: 'P2132',
  gdpPpp: 'P4010',
  unemploymentRate: 'P1198',

  // Geographic
  area: 'P2046',
  coordinates: 'P625',
  capital: 'P36',

  // Administrative
  country: 'P17',
  headOfState: 'P35',
  headOfGovernment: 'P6',

  // Qualifiers
  pointInTime: 'P585',
  determinationMethod: 'P459',
  referenceUrl: 'P854',
} as const;

/**
 * Common Wikidata entity types
 */
export const WikidataEntityTypes = {
  country: 'Q6256',
  sovereignState: 'Q3624078',
  city: 'Q515',
  capitalCity: 'Q5119',
  continent: 'Q5107',
  region: 'Q82794',
} as const;

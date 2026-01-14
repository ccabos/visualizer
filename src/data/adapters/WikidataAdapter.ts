/**
 * Wikidata SPARQL adapter
 */

import { BaseAdapter, FetchMetadata } from './BaseAdapter';
import { wikidataConfig, WikidataProperties, WikidataEntityTypes } from '../registry/wikidata';
import { CanonicalQuery } from '../../types/query';
import { TimeSeriesDataset, CrossSectionDataset, NormalizedDataset, DataPoint } from '../../types/dataset';
import { CatalogEntry } from '../../types/catalog';

// SPARQL JSON response types
interface SparqlBinding {
  type: 'uri' | 'literal' | 'bnode';
  value: string;
  datatype?: string;
  'xml:lang'?: string;
}

interface SparqlResults {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<Record<string, SparqlBinding>>;
  };
}

// Mapping from our indicator IDs to Wikidata properties
const INDICATOR_PROPERTY_MAP: Record<string, string> = {
  'wikidata:population': WikidataProperties.population,
  'wikidata:gdp': WikidataProperties.gdp,
  'wikidata:gdp_per_capita': WikidataProperties.gdpPerCapita,
  'wikidata:life_expectancy': WikidataProperties.lifeExpectancy,
  'wikidata:hdi': WikidataProperties.humanDevelopmentIndex,
  'wikidata:area': WikidataProperties.area,
  'wikidata:unemployment': WikidataProperties.unemploymentRate,
};

// Indicator metadata
const INDICATOR_LABELS: Record<string, { label: string; unit: string }> = {
  'wikidata:population': { label: 'Population', unit: '' },
  'wikidata:gdp': { label: 'GDP (nominal)', unit: 'USD' },
  'wikidata:gdp_per_capita': { label: 'GDP per capita', unit: 'USD' },
  'wikidata:life_expectancy': { label: 'Life expectancy', unit: 'years' },
  'wikidata:hdi': { label: 'Human Development Index', unit: '' },
  'wikidata:area': { label: 'Area', unit: 'km²' },
  'wikidata:unemployment': { label: 'Unemployment rate', unit: '%' },
};

export class WikidataAdapter extends BaseAdapter {
  constructor() {
    super(wikidataConfig);
  }

  /**
   * Build SPARQL query URL
   */
  buildUrl(query: CanonicalQuery): string {
    const sparql = this.buildSparqlQuery(query);
    const encodedQuery = encodeURIComponent(sparql);
    return `${this.config.baseUrl}/sparql?format=json&query=${encodedQuery}`;
  }

  /**
   * Build SPARQL query string based on canonical query
   */
  buildSparqlQuery(query: CanonicalQuery): string {
    const { entities, y, filters } = query;
    const indicatorId = y[0].indicatorId;
    const propertyId = INDICATOR_PROPERTY_MAP[indicatorId];

    if (!propertyId) {
      throw new Error(`Unknown indicator: ${indicatorId}`);
    }

    const { start, end } = filters.timeRange;

    // Build entity filter - either specific countries or all countries
    let entityFilter = '';
    if (entities.length > 0 && entities[0] !== 'ALL') {
      // Convert ISO3 codes to Wikidata entity IDs
      const entityValues = entities.map((e) => `"${e}"`).join(' ');
      entityFilter = `
        VALUES ?iso3 { ${entityValues} }
        ?entity wdt:P298 ?iso3 .
      `;
    } else {
      // Default to sovereign states
      entityFilter = `?entity wdt:P31 wd:${WikidataEntityTypes.sovereignState} .`;
    }

    // Time series query with point-in-time qualifiers
    if (query.queryType === 'time_series') {
      return `
        SELECT ?entity ?entityLabel ?date ?value WHERE {
          ${entityFilter}
          ?entity p:${propertyId} ?statement .
          ?statement ps:${propertyId} ?value .
          ?statement pq:${WikidataProperties.pointInTime} ?date .

          FILTER(YEAR(?date) >= ${parseInt(start)} && YEAR(?date) <= ${parseInt(end)})

          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        ORDER BY ?entity ?date
      `;
    }

    // Cross-section query - get latest values
    return `
      SELECT ?entity ?entityLabel ?value ?date WHERE {
        ${entityFilter}
        ?entity p:${propertyId} ?statement .
        ?statement ps:${propertyId} ?value .
        OPTIONAL { ?statement pq:${WikidataProperties.pointInTime} ?date . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY DESC(?date)
    `;
  }

  /**
   * Get custom headers for Wikidata requests
   */
  protected getHeaders(): HeadersInit {
    return {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'QuickDataViz/1.0 (https://github.com/ccabos/visualizer)',
    };
  }

  /**
   * Parse SPARQL JSON response
   */
  async parseResponse(response: Response): Promise<SparqlResults> {
    const json = await response.json();
    return json as SparqlResults;
  }

  /**
   * Normalize SPARQL results to canonical format
   */
  normalize(
    rawData: unknown,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): NormalizedDataset {
    const sparqlResults = rawData as SparqlResults;
    const bindings = sparqlResults.results.bindings;

    if (bindings.length === 0) {
      return this.createEmptyDataset(query, metadata);
    }

    if (query.queryType === 'cross_section') {
      return this.normalizeCrossSection(bindings, query, metadata);
    }

    return this.normalizeTimeSeries(bindings, query, metadata);
  }

  /**
   * Normalize to time series dataset
   */
  private normalizeTimeSeries(
    bindings: Array<Record<string, SparqlBinding>>,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): TimeSeriesDataset {
    const indicatorId = query.y[0].indicatorId;
    const indicatorMeta = INDICATOR_LABELS[indicatorId] || { label: indicatorId, unit: '' };

    // Group by entity
    const seriesByEntity = new Map<
      string,
      { entityLabel: string; points: DataPoint[] }
    >();

    for (const binding of bindings) {
      const entityUri = binding.entity?.value || '';
      const entityId = this.extractEntityId(entityUri);
      const entityLabel = binding.entityLabel?.value || entityId;
      const dateStr = binding.date?.value || '';
      const value = this.parseNumericValue(binding.value?.value);

      if (!entityId || !dateStr || value === null) continue;

      const year = this.extractYear(dateStr);
      if (!year) continue;

      if (!seriesByEntity.has(entityId)) {
        seriesByEntity.set(entityId, {
          entityLabel,
          points: [],
        });
      }

      seriesByEntity.get(entityId)!.points.push({
        t: year,
        v: value,
      });
    }

    // Sort points by time and remove duplicates (keep latest)
    for (const series of seriesByEntity.values()) {
      // Sort by year
      series.points.sort((a, b) => a.t.localeCompare(b.t));

      // Remove duplicate years (keep last value)
      const uniquePoints: DataPoint[] = [];
      let lastYear = '';
      for (const point of series.points) {
        if (point.t !== lastYear) {
          uniquePoints.push(point);
          lastYear = point.t;
        } else {
          // Replace with newer value
          uniquePoints[uniquePoints.length - 1] = point;
        }
      }
      series.points = uniquePoints;
    }

    return {
      kind: 'TimeSeriesDataset',
      series: Array.from(seriesByEntity.entries()).map(([entityId, data]) => ({
        entityId,
        entityLabel: data.entityLabel,
        indicatorId,
        indicatorLabel: indicatorMeta.label,
        points: data.points,
        unit: query.y[0].unit || indicatorMeta.unit,
      })),
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Normalize to cross section dataset
   */
  private normalizeCrossSection(
    bindings: Array<Record<string, SparqlBinding>>,
    query: CanonicalQuery,
    metadata: FetchMetadata
  ): CrossSectionDataset {
    const indicatorId = query.y[0].indicatorId;
    const indicatorMeta = INDICATOR_LABELS[indicatorId] || { label: indicatorId, unit: '' };
    const targetYear = query.filters.timeRange.end;

    // Get the most recent value for each entity
    const entityValues = new Map<
      string,
      { label: string; value: number | null; year: string }
    >();

    for (const binding of bindings) {
      const entityUri = binding.entity?.value || '';
      const entityId = this.extractEntityId(entityUri);
      const entityLabel = binding.entityLabel?.value || entityId;
      const dateStr = binding.date?.value || '';
      const value = this.parseNumericValue(binding.value?.value);

      if (!entityId) continue;

      const year = dateStr ? this.extractYear(dateStr) || targetYear : targetYear;
      const existing = entityValues.get(entityId);

      if (!existing || year >= existing.year) {
        entityValues.set(entityId, {
          label: entityLabel,
          value,
          year,
        });
      }
    }

    return {
      kind: 'CrossSectionDataset',
      indicatorId,
      indicatorLabel: indicatorMeta.label,
      time: targetYear,
      rows: Array.from(entityValues.entries()).map(([entityId, data]) => ({
        entityId,
        entityLabel: data.label,
        value: data.value,
      })),
      unit: query.y[0].unit || indicatorMeta.unit,
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Create empty dataset when no data is returned
   */
  private createEmptyDataset(
    _query: CanonicalQuery,
    metadata: FetchMetadata
  ): TimeSeriesDataset {
    return {
      kind: 'TimeSeriesDataset',
      series: [],
      provenance: {
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        queryUrl: metadata.queryUrl,
        retrievedAt: metadata.retrievedAt,
        attribution: this.config.attribution,
      },
    };
  }

  /**
   * Extract entity ID from Wikidata URI
   */
  private extractEntityId(uri: string): string {
    const match = uri.match(/Q\d+$/);
    return match ? match[0] : '';
  }

  /**
   * Extract year from ISO date string
   */
  private extractYear(dateStr: string): string | null {
    const match = dateStr.match(/^(\d{4})/);
    return match ? match[1] : null;
  }

  /**
   * Parse numeric value from SPARQL binding
   */
  private parseNumericValue(value: string | undefined): number | null {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Search for available properties on entities
   */
  async searchIndicators(searchTerm: string): Promise<CatalogEntry[]> {
    // Return curated indicators that match search term
    const searchLower = searchTerm.toLowerCase();

    return Object.entries(INDICATOR_LABELS)
      .filter(
        ([id, meta]) =>
          id.toLowerCase().includes(searchLower) ||
          meta.label.toLowerCase().includes(searchLower)
      )
      .map(([id, meta]) => ({
        sourceId: this.config.id,
        sourceName: this.config.displayName,
        datasetId: 'wikidata',
        indicatorId: id,
        title: meta.label,
        description: `${meta.label} from Wikidata`,
        unit: meta.unit,
        topics: ['Demographics', 'Economy'],
        geography: 'country' as const,
        exampleQuery: {
          queryType: 'time_series' as const,
          entities: ['DEU'],
          timeRange: { start: '2000', end: '2023' },
        },
      }));
  }

  /**
   * Get available countries from Wikidata
   */
  async getEntities(): Promise<Array<{ id: string; label: string }>> {
    const sparql = `
      SELECT ?country ?countryLabel ?iso3 WHERE {
        ?country wdt:P31 wd:${WikidataEntityTypes.sovereignState} .
        ?country wdt:P298 ?iso3 .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY ?countryLabel
      LIMIT 300
    `;

    const url = `${this.config.baseUrl}/sparql?format=json&query=${encodeURIComponent(sparql)}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entities: ${response.statusText}`);
    }

    const data = (await response.json()) as SparqlResults;

    return data.results.bindings.map((binding) => ({
      id: binding.iso3?.value || this.extractEntityId(binding.country?.value || ''),
      label: binding.countryLabel?.value || '',
    }));
  }

  /**
   * Execute a custom SPARQL query
   */
  async executeCustomSparql(sparqlQuery: string): Promise<SparqlResults> {
    const url = `${this.config.baseUrl}/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.statusText}`);
    }

    return response.json();
  }
}

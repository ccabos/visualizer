/**
 * AI Tool definitions for data exploration
 */

import { ToolDefinition, ToolResult } from './types';
import { WikidataAdapter } from '../../data/adapters/WikidataAdapter';
import { curatedIndicators, searchCatalog } from '../../data/catalog/curated-indicators';
import { CanonicalQuery, ChartType } from '../../types/query';

/**
 * Tool definitions for the AI to use
 */
export const explorationTools: ToolDefinition[] = [
  {
    name: 'search_indicators',
    description:
      'Search for available data indicators across all data sources (World Bank, Eurostat, OWID, Wikidata). Use this to find what data is available for visualization.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query to find indicators. Examples: "GDP", "population", "CO2 emissions", "life expectancy"',
        },
        source: {
          type: 'string',
          description: 'Optional: filter by data source',
          enum: ['worldbank', 'eurostat', 'owid', 'wikidata'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_wikidata_entities',
    description:
      'Search for entities (countries, cities, organizations, etc.) in Wikidata by name. Use this to find the correct entity IDs for queries.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for entity name. Examples: "Germany", "Paris", "United Nations"',
        },
        type: {
          type: 'string',
          description: 'Type of entity to search for',
          enum: ['country', 'city', 'organization', 'person', 'any'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_wikidata_properties',
    description:
      'Get available properties/data types for a Wikidata entity type. Use this to discover what data can be queried for countries, cities, etc.',
    parameters: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'Type of entity to get properties for',
          enum: ['country', 'city', 'organization'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of properties to return (default: 20)',
        },
      },
      required: ['entityType'],
    },
  },
  {
    name: 'execute_sparql',
    description:
      'Execute a SPARQL query against Wikidata. Use this for custom queries when the predefined indicators are not sufficient. Returns raw SPARQL results.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The SPARQL query to execute. Must be a valid Wikidata SPARQL query. Always include SERVICE wikibase:label for human-readable labels.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_visualization',
    description:
      'Create a visualization/chart from data. Use this after finding the right indicator and entities to generate the actual chart.',
    parameters: {
      type: 'object',
      properties: {
        sourceId: {
          type: 'string',
          description: 'Data source ID',
          enum: ['worldbank', 'eurostat', 'owid', 'wikidata'],
        },
        indicatorId: {
          type: 'string',
          description: 'The indicator ID to visualize (e.g., "NY.GDP.PCAP.CD" for World Bank GDP per capita)',
        },
        indicatorLabel: {
          type: 'string',
          description: 'Human-readable label for the indicator',
        },
        entities: {
          type: 'array',
          description:
            'Array of entity IDs to include (e.g., ["DEU", "FRA", "USA"] for country ISO3 codes)',
          items: { type: 'string', description: 'Entity ID (ISO3 country code or Wikidata Q-ID)' },
        },
        startYear: {
          type: 'string',
          description: 'Start year for the time range (e.g., "2000")',
        },
        endYear: {
          type: 'string',
          description: 'End year for the time range (e.g., "2023")',
        },
        chartType: {
          type: 'string',
          description: 'Type of chart to create',
          enum: ['line', 'bar', 'scatter'],
        },
        unit: {
          type: 'string',
          description: 'Unit of measurement for the indicator (e.g., "USD", "%", "years")',
        },
      },
      required: ['sourceId', 'indicatorId', 'indicatorLabel', 'entities', 'startYear', 'endYear', 'chartType'],
    },
  },
  {
    name: 'list_curated_indicators',
    description:
      'List all curated/pre-configured indicators that are ready to use. These are reliable, tested data sources.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Optional: filter by data source',
          enum: ['worldbank', 'eurostat', 'owid', 'wikidata'],
        },
        topic: {
          type: 'string',
          description: 'Optional: filter by topic',
          enum: ['economy', 'health', 'environment', 'energy', 'demographics', 'society'],
        },
      },
    },
  },
];

/**
 * Tool executor - executes tools and returns results
 */
export class ToolExecutor {
  private wikidataAdapter: WikidataAdapter;
  private onVisualizationRequest?: (query: CanonicalQuery) => void;

  constructor(onVisualizationRequest?: (query: CanonicalQuery) => void) {
    this.wikidataAdapter = new WikidataAdapter();
    this.onVisualizationRequest = onVisualizationRequest;
  }

  /**
   * Execute a tool and return the result
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const toolCallId = `tool_${Date.now()}`;

    try {
      let result: unknown;

      switch (toolName) {
        case 'search_indicators':
          result = await this.searchIndicators(
            args.query as string,
            args.source as string | undefined
          );
          break;

        case 'search_wikidata_entities':
          result = await this.searchWikidataEntities(
            args.query as string,
            args.type as string | undefined
          );
          break;

        case 'get_wikidata_properties':
          result = await this.getWikidataProperties(
            args.entityType as string,
            args.limit as number | undefined
          );
          break;

        case 'execute_sparql':
          result = await this.executeSparql(args.query as string);
          break;

        case 'create_visualization':
          result = this.createVisualization(args);
          break;

        case 'list_curated_indicators':
          result = this.listCuratedIndicators(
            args.source as string | undefined,
            args.topic as string | undefined
          );
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return { toolCallId, result };
    } catch (error) {
      return {
        toolCallId,
        result: `Error: ${(error as Error).message}`,
        isError: true,
      };
    }
  }

  /**
   * Search for indicators
   */
  private async searchIndicators(
    query: string,
    source?: string
  ): Promise<unknown> {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }
    const results = searchCatalog(query, { sourceId: source });

    return results.slice(0, 10).map((ind) => ({
      sourceId: ind.sourceId,
      sourceName: ind.sourceName,
      indicatorId: ind.indicatorId,
      title: ind.title,
      description: ind.description,
      unit: ind.unit,
      topics: ind.topics,
    }));
  }

  /**
   * Search Wikidata entities
   */
  private async searchWikidataEntities(
    query: string,
    _type?: string
  ): Promise<unknown> {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }
    // Use Wikidata API for entity search
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&origin=*&limit=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikidata search failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      search: Array<{
        id: string;
        label: string;
        description?: string;
      }>;
    };

    return data.search.map((entity) => ({
      id: entity.id,
      label: entity.label,
      description: entity.description,
    }));
  }

  /**
   * Get Wikidata properties for an entity type
   */
  private async getWikidataProperties(
    entityType: string,
    limit: number = 20
  ): Promise<unknown> {
    if (!entityType || typeof entityType !== 'string') {
      throw new Error('Entity type is required');
    }
    const entityTypeMap: Record<string, string> = {
      country: 'Q6256',
      city: 'Q515',
      organization: 'Q43229',
    };

    const typeId = entityTypeMap[entityType] || entityTypeMap.country;

    const sparql = `
      SELECT ?property ?propertyLabel (COUNT(*) as ?count) WHERE {
        ?entity wdt:P31 wd:${typeId} .
        ?entity ?p ?value .
        ?property wikibase:directClaim ?p .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?property ?propertyLabel
      ORDER BY DESC(?count)
      LIMIT ${limit}
    `;

    const results = await this.wikidataAdapter.executeCustomSparql(sparql);

    return results.results.bindings.map((binding) => ({
      propertyId: binding.property?.value?.split('/').pop(),
      label: binding.propertyLabel?.value,
      usageCount: parseInt(binding.count?.value || '0'),
    }));
  }

  /**
   * Execute custom SPARQL query
   */
  private async executeSparql(query: string): Promise<unknown> {
    if (!query || typeof query !== 'string') {
      throw new Error('SPARQL query is required');
    }
    const results = await this.wikidataAdapter.executeCustomSparql(query);

    // Simplify the results for the AI
    return {
      variables: results.head.vars,
      rowCount: results.results.bindings.length,
      rows: results.results.bindings.slice(0, 20).map((binding) => {
        const row: Record<string, string> = {};
        for (const [key, value] of Object.entries(binding)) {
          row[key] = value.value;
        }
        return row;
      }),
    };
  }

  /**
   * Create a visualization
   */
  private createVisualization(args: Record<string, unknown>): unknown {
    const query: CanonicalQuery = {
      version: 1,
      sourceId: args.sourceId as string,
      queryType: args.chartType === 'scatter' ? 'scatter' : 'time_series',
      entities: args.entities as string[],
      y: [
        {
          indicatorId: args.indicatorId as string,
          label: args.indicatorLabel as string,
          unit: args.unit as string | undefined,
        },
      ],
      filters: {
        timeRange: {
          start: args.startYear as string,
          end: args.endYear as string,
        },
      },
      render: {
        chartType: args.chartType as ChartType,
      },
    };

    // Notify the UI to create the visualization
    if (this.onVisualizationRequest) {
      this.onVisualizationRequest(query);
    }

    return {
      success: true,
      message: 'Visualization created',
      query,
    };
  }

  /**
   * List curated indicators
   */
  private listCuratedIndicators(source?: string, topic?: string): unknown {
    let indicators = curatedIndicators;

    if (source) {
      indicators = indicators.filter((ind) => ind.sourceId === source);
    }

    if (topic && typeof topic === 'string') {
      const topicLower = topic.toLowerCase();
      indicators = indicators.filter((ind) =>
        ind.topics.some((t) => t && t.toLowerCase().includes(topicLower))
      );
    }

    return indicators.map((ind) => ({
      sourceId: ind.sourceId,
      indicatorId: ind.indicatorId,
      title: ind.title,
      unit: ind.unit,
      topics: ind.topics,
    }));
  }
}

/**
 * System prompt for the AI explorer
 */
export const EXPLORER_SYSTEM_PROMPT = `You are a helpful data exploration assistant for a visualization tool. Your job is to help users find and visualize data from various sources including World Bank, Eurostat, Our World in Data, and Wikidata.

When a user asks about data or wants to create a chart:

1. First, search for relevant indicators using the search_indicators tool
2. If the user mentions specific countries or entities, use search_wikidata_entities to find the correct IDs
3. Once you have the indicator and entities, use create_visualization to generate the chart

For complex queries involving Wikidata:
1. Use get_wikidata_properties to discover available data for entity types
2. Use execute_sparql for custom queries when needed

Always explain what data you found and ask for confirmation before creating visualizations.

Tips:
- World Bank uses ISO3 country codes (DEU, FRA, USA)
- Eurostat uses ISO2 codes (DE, FR, US)
- OWID uses full country names (Germany, France, United States)
- Wikidata uses Q-IDs (Q183 for Germany) but also accepts ISO3 codes for curated indicators

When creating visualizations:
- Line charts are best for time series data
- Bar charts are good for comparing values across entities
- Scatter plots work well for showing relationships between two variables`;

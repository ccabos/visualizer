/**
 * Tests for AI services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeService } from './claude';
import { OpenAIService } from './openai';
import { explorationTools, ToolExecutor } from './tools';
import { AIServiceError } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    service = new ClaudeService('test-api-key');
    vi.clearAllMocks();
  });

  describe('isReady', () => {
    it('should return true when API key is set', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      const emptyService = new ClaudeService('');
      expect(emptyService.isReady()).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return anthropic', () => {
      expect(service.getProvider()).toBe('anthropic');
    });
  });

  describe('complete', () => {
    it('should make a successful API call', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.finishReason).toBe('stop');
      expect(result.usage?.inputTokens).toBe(10);
      expect(result.usage?.outputTokens).toBe(5);
    });

    it('should handle tool use response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me search for that.' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'search_indicators',
            input: { query: 'GDP' },
          },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'tool_use',
        usage: { input_tokens: 20, output_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.complete({
        messages: [{ role: 'user', content: 'Search for GDP data' }],
        tools: explorationTools,
      });

      expect(result.content).toBe('Let me search for that.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('search_indicators');
      expect(result.toolCalls[0].arguments).toEqual({ query: 'GDP' });
      expect(result.finishReason).toBe('tool_use');
    });

    it('should throw AIServiceError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(
        service.complete({ messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow(AIServiceError);
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      });

      try {
        await service.complete({ messages: [{ role: 'user', content: 'Hi' }] });
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as AIServiceError).isRetryable).toBe(true);
      }
    });
  });
});

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeEach(() => {
    service = new OpenAIService('test-api-key');
    vi.clearAllMocks();
  });

  describe('isReady', () => {
    it('should return true when API key is set', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      const emptyService = new OpenAIService('');
      expect(emptyService.isReady()).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return openai', () => {
      expect(service.getProvider()).toBe('openai');
    });
  });

  describe('complete', () => {
    it('should make a successful API call', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.finishReason).toBe('stop');
      expect(result.usage?.inputTokens).toBe(10);
      expect(result.usage?.outputTokens).toBe(5);
    });

    it('should handle tool calls response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'search_indicators',
                    arguments: '{"query": "GDP"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.complete({
        messages: [{ role: 'user', content: 'Search for GDP data' }],
        tools: explorationTools,
      });

      expect(result.content).toBeNull();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('search_indicators');
      expect(result.toolCalls[0].arguments).toEqual({ query: 'GDP' });
      expect(result.finishReason).toBe('tool_use');
    });

    it('should throw AIServiceError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(
        service.complete({ messages: [{ role: 'user', content: 'Hi' }] })
      ).rejects.toThrow(AIServiceError);
    });
  });
});

describe('explorationTools', () => {
  it('should define search_indicators tool', () => {
    const tool = explorationTools.find((t) => t.name === 'search_indicators');
    expect(tool).toBeDefined();
    expect(tool?.parameters.properties.query).toBeDefined();
  });

  it('should define create_visualization tool', () => {
    const tool = explorationTools.find((t) => t.name === 'create_visualization');
    expect(tool).toBeDefined();
    expect(tool?.parameters.required).toContain('indicatorId');
    expect(tool?.parameters.required).toContain('entities');
  });

  it('should define all required tools', () => {
    const toolNames = explorationTools.map((t) => t.name);
    expect(toolNames).toContain('search_indicators');
    expect(toolNames).toContain('search_wikidata_entities');
    expect(toolNames).toContain('get_wikidata_properties');
    expect(toolNames).toContain('execute_sparql');
    expect(toolNames).toContain('create_visualization');
    expect(toolNames).toContain('list_curated_indicators');
  });
});

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let visualizationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    visualizationCallback = vi.fn();
    executor = new ToolExecutor(visualizationCallback);
    vi.clearAllMocks();
  });

  describe('search_indicators', () => {
    it('should search for indicators', async () => {
      const result = await executor.execute('search_indicators', { query: 'GDP' });

      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.result)).toBe(true);
    });
  });

  describe('list_curated_indicators', () => {
    it('should list curated indicators', async () => {
      const result = await executor.execute('list_curated_indicators', {});

      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.result)).toBe(true);
      expect((result.result as unknown[]).length).toBeGreaterThan(0);
    });

    it('should filter by source', async () => {
      const result = await executor.execute('list_curated_indicators', {
        source: 'worldbank',
      });

      expect(result.isError).toBeFalsy();
      const indicators = result.result as Array<{ sourceId: string }>;
      expect(indicators.every((i) => i.sourceId === 'worldbank')).toBe(true);
    });
  });

  describe('create_visualization', () => {
    it('should call visualization callback', async () => {
      const result = await executor.execute('create_visualization', {
        sourceId: 'worldbank',
        indicatorId: 'NY.GDP.PCAP.CD',
        indicatorLabel: 'GDP per capita',
        entities: ['DEU', 'FRA'],
        startYear: '2000',
        endYear: '2023',
        chartType: 'line',
        unit: 'USD',
      });

      expect(result.isError).toBeFalsy();
      expect(visualizationCallback).toHaveBeenCalledTimes(1);
      expect(visualizationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'worldbank',
          entities: ['DEU', 'FRA'],
        })
      );
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const result = await executor.execute('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Unknown tool');
    });
  });
});

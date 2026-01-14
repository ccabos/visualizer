/**
 * Claude (Anthropic) AI Service implementation
 */

import {
  AIService,
  AIResponse,
  AIServiceError,
  CompletionOptions,
  StreamOptions,
  ToolDefinition,
  ToolCall,
  ToolResult,
  Message,
} from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Anthropic API message format
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

/**
 * Anthropic API tool format
 */
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Anthropic API response format
 */
interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic streaming event types
 */
interface AnthropicStreamEvent {
  type: string;
  index?: number;
  content_block?: AnthropicContent;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  message?: AnthropicResponse;
  usage?: {
    output_tokens: number;
  };
}

export class ClaudeService implements AIService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get provider name
   */
  getProvider(): 'anthropic' {
    return 'anthropic';
  }

  /**
   * Convert our tool format to Anthropic format
   */
  private convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  /**
   * Convert our messages to Anthropic format
   */
  private convertMessages(
    messages: Message[],
    toolResults?: ToolResult[]
  ): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    // Collect consecutive tool results to batch them
    let pendingToolResults: AnthropicContent[] = [];

    const flushToolResults = () => {
      if (pendingToolResults.length > 0) {
        result.push({
          role: 'user',
          content: pendingToolResults,
        });
        pendingToolResults = [];
      }
    };

    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately in Anthropic API
        continue;
      }

      // Handle tool role messages (tool results in conversation history)
      if (msg.role === 'tool') {
        pendingToolResults.push({
          type: 'tool_result',
          tool_use_id: msg.toolCallId || '',
          content: msg.content,
        });
        continue;
      }

      // Flush any pending tool results before non-tool messages
      flushToolResults();

      // If assistant message has tool calls, include them as tool_use blocks
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const content: AnthropicContent[] = [];

        // Add text content if present
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }

        // Add tool_use blocks
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }

        result.push({
          role: 'assistant',
          content,
        });
      } else {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Flush any remaining tool results
    flushToolResults();

    // Add tool results if present
    if (toolResults && toolResults.length > 0) {
      const toolResultContent: AnthropicContent[] = toolResults.map((tr) => ({
        type: 'tool_result' as const,
        tool_use_id: tr.toolCallId,
        content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
        is_error: tr.isError,
      }));

      result.push({
        role: 'user',
        content: toolResultContent,
      });
    }

    return result;
  }

  /**
   * Extract system prompt from messages
   */
  private getSystemPrompt(messages: Message[], systemPrompt?: string): string | undefined {
    if (systemPrompt) return systemPrompt;

    const systemMsg = messages.find((m) => m.role === 'system');
    return systemMsg?.content;
  }

  /**
   * Parse Anthropic response to our format
   */
  private parseResponse(response: AnthropicResponse): AIResponse {
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    let finishReason: AIResponse['finishReason'] = 'stop';
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_use';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    }

    return {
      content: textContent || null,
      toolCalls,
      finishReason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Make a completion request
   */
  async complete(options: CompletionOptions): Promise<AIResponse> {
    const {
      messages,
      tools,
      toolResults,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.7,
      systemPrompt,
    } = options;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      messages: this.convertMessages(messages, toolResults),
    };

    const system = this.getSystemPrompt(messages, systemPrompt);
    if (system) {
      body.system = system;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
    }

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || response.statusText;
        throw new AIServiceError(
          `Anthropic API error: ${errorMessage}`,
          'anthropic',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const data = (await response.json()) as AnthropicResponse;
      return this.parseResponse(data);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to call Anthropic API: ${(error as Error).message}`,
        'anthropic',
        undefined,
        true
      );
    }
  }

  /**
   * Stream a completion request
   */
  async stream(options: StreamOptions): Promise<AIResponse> {
    const {
      messages,
      tools,
      toolResults,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = 0.7,
      systemPrompt,
      onChunk,
    } = options;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: this.convertMessages(messages, toolResults),
    };

    const system = this.getSystemPrompt(messages, systemPrompt);
    if (system) {
      body.system = system;
    }

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
    }

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || response.statusText;
        throw new AIServiceError(
          `Anthropic API error: ${errorMessage}`,
          'anthropic',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIServiceError('No response body', 'anthropic');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      const toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;
      let toolCallJson = '';
      let finishReason: AIResponse['finishReason'] = 'stop';
      let usage = { inputTokens: 0, outputTokens: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as AnthropicStreamEvent;

            switch (event.type) {
              case 'content_block_start':
                if (event.content_block?.type === 'tool_use') {
                  currentToolCall = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                  };
                  toolCallJson = '';
                  onChunk({
                    type: 'tool_call_start',
                    toolCall: currentToolCall,
                  });
                }
                break;

              case 'content_block_delta':
                if (event.delta?.type === 'text_delta' && event.delta.text) {
                  fullContent += event.delta.text;
                  onChunk({
                    type: 'text',
                    content: event.delta.text,
                  });
                } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
                  toolCallJson += event.delta.partial_json;
                  onChunk({
                    type: 'tool_call_delta',
                    content: event.delta.partial_json,
                  });
                }
                break;

              case 'content_block_stop':
                if (currentToolCall) {
                  try {
                    currentToolCall.arguments = JSON.parse(toolCallJson);
                  } catch {
                    currentToolCall.arguments = {};
                  }
                  toolCalls.push(currentToolCall as ToolCall);
                  onChunk({
                    type: 'tool_call_end',
                    toolCall: currentToolCall,
                  });
                  currentToolCall = null;
                }
                break;

              case 'message_delta':
                if (event.delta?.type === 'message_delta') {
                  const stopReason = (event as unknown as { delta: { stop_reason: string } }).delta.stop_reason;
                  if (stopReason === 'tool_use') {
                    finishReason = 'tool_use';
                  } else if (stopReason === 'max_tokens') {
                    finishReason = 'length';
                  }
                }
                if (event.usage) {
                  usage.outputTokens = event.usage.output_tokens;
                }
                break;

              case 'message_start':
                if (event.message?.usage) {
                  usage.inputTokens = event.message.usage.input_tokens;
                }
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      onChunk({ type: 'done' });

      return {
        content: fullContent || null,
        toolCalls,
        finishReason,
        usage,
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to stream from Anthropic API: ${(error as Error).message}`,
        'anthropic',
        undefined,
        true
      );
    }
  }
}

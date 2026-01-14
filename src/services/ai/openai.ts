/**
 * OpenAI AI Service implementation
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

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * OpenAI API message format
 */
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

/**
 * OpenAI tool call format
 */
interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI API tool format
 */
interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * OpenAI API response format
 */
interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI streaming chunk format
 */
interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenAIService implements AIService {
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
  getProvider(): 'openai' {
    return 'openai';
  }

  /**
   * Convert our tool format to OpenAI format
   */
  private convertTools(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    }));
  }

  /**
   * Convert our messages to OpenAI format
   */
  private convertMessages(
    messages: Message[],
    toolResults?: ToolResult[],
    systemPrompt?: string
  ): OpenAIMessage[] {
    const result: OpenAIMessage[] = [];

    // Add system prompt first if provided
    if (systemPrompt) {
      result.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    for (const msg of messages) {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add tool results if present
    if (toolResults && toolResults.length > 0) {
      for (const tr of toolResults) {
        result.push({
          role: 'tool',
          content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
          tool_call_id: tr.toolCallId,
        });
      }
    }

    return result;
  }

  /**
   * Parse OpenAI response to our format
   */
  private parseResponse(response: OpenAIResponse): AIResponse {
    const choice = response.choices[0];
    if (!choice) {
      return {
        content: null,
        toolCalls: [],
        finishReason: 'error',
      };
    }

    const toolCalls: ToolCall[] = (choice.message.tool_calls || []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

    let finishReason: AIResponse['finishReason'] = 'stop';
    if (choice.finish_reason === 'tool_calls') {
      finishReason = 'tool_use';
    } else if (choice.finish_reason === 'length') {
      finishReason = 'length';
    }

    return {
      content: choice.message.content,
      toolCalls,
      finishReason,
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
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
      messages: this.convertMessages(messages, toolResults, systemPrompt),
    };

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
      body.tool_choice = 'auto';
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || response.statusText;
        throw new AIServiceError(
          `OpenAI API error: ${errorMessage}`,
          'openai',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const data = (await response.json()) as OpenAIResponse;
      return this.parseResponse(data);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to call OpenAI API: ${(error as Error).message}`,
        'openai',
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
      stream_options: { include_usage: true },
      messages: this.convertMessages(messages, toolResults, systemPrompt),
    };

    if (tools && tools.length > 0) {
      body.tools = this.convertTools(tools);
      body.tool_choice = 'auto';
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || response.statusText;
        throw new AIServiceError(
          `OpenAI API error: ${errorMessage}`,
          'openai',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIServiceError('No response body', 'openai');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      const toolCallsMap = new Map<number, ToolCall>();
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
            const chunk = JSON.parse(data) as OpenAIStreamChunk;
            const choice = chunk.choices[0];

            if (!choice) continue;

            // Handle text content
            if (choice.delta.content) {
              fullContent += choice.delta.content;
              onChunk({
                type: 'text',
                content: choice.delta.content,
              });
            }

            // Handle tool calls
            if (choice.delta.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                const existing = toolCallsMap.get(tc.index);

                if (!existing) {
                  // New tool call
                  const newToolCall: ToolCall = {
                    id: tc.id || '',
                    name: tc.function?.name || '',
                    arguments: {},
                  };
                  toolCallsMap.set(tc.index, newToolCall);
                  onChunk({
                    type: 'tool_call_start',
                    toolCall: newToolCall,
                  });
                } else {
                  // Append to existing tool call
                  if (tc.function?.arguments) {
                    const currentArgs = JSON.stringify(existing.arguments);
                    const argsStr = currentArgs === '{}' ? '' : currentArgs.slice(0, -1);
                    try {
                      existing.arguments = JSON.parse(argsStr + tc.function.arguments);
                    } catch {
                      // Still building JSON, store as string temporarily
                      (existing as unknown as { _argsBuffer: string })._argsBuffer =
                        ((existing as unknown as { _argsBuffer?: string })._argsBuffer || '') +
                        tc.function.arguments;
                    }
                    onChunk({
                      type: 'tool_call_delta',
                      content: tc.function.arguments,
                    });
                  }
                }
              }
            }

            // Handle finish reason
            if (choice.finish_reason) {
              if (choice.finish_reason === 'tool_calls') {
                finishReason = 'tool_use';
              } else if (choice.finish_reason === 'length') {
                finishReason = 'length';
              }

              // Finalize tool calls
              for (const tc of toolCallsMap.values()) {
                const argsBuffer = (tc as unknown as { _argsBuffer?: string })._argsBuffer;
                if (argsBuffer) {
                  try {
                    tc.arguments = JSON.parse(argsBuffer);
                  } catch {
                    tc.arguments = {};
                  }
                }
                onChunk({
                  type: 'tool_call_end',
                  toolCall: tc,
                });
              }
            }

            // Handle usage
            if (chunk.usage) {
              usage = {
                inputTokens: chunk.usage.prompt_tokens,
                outputTokens: chunk.usage.completion_tokens,
              };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      onChunk({ type: 'done' });

      return {
        content: fullContent || null,
        toolCalls: Array.from(toolCallsMap.values()),
        finishReason,
        usage,
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to stream from OpenAI API: ${(error as Error).message}`,
        'openai',
        undefined,
        true
      );
    }
  }
}

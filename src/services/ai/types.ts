/**
 * AI Service type definitions
 */

/**
 * Message roles in a conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * A message in the conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool role messages - the ID of the tool call this is responding to
}

/**
 * Tool/function parameter definition
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

/**
 * Tool/function definition for AI to call
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * A tool call made by the AI
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

/**
 * AI response that may include tool calls
 */
export interface AIResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: 'stop' | 'tool_use' | 'length' | 'error';
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Options for AI completion requests
 */
export interface CompletionOptions {
  messages: Message[];
  tools?: ToolDefinition[];
  toolResults?: ToolResult[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Streaming chunk from AI
 */
export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done';
  content?: string;
  toolCall?: Partial<ToolCall>;
}

/**
 * Options for streaming completion
 */
export interface StreamOptions extends CompletionOptions {
  onChunk: (chunk: StreamChunk) => void;
}

/**
 * AI Service interface - implemented by Claude and OpenAI services
 */
export interface AIService {
  /**
   * Get a completion from the AI
   */
  complete(options: CompletionOptions): Promise<AIResponse>;

  /**
   * Stream a completion from the AI
   */
  stream(options: StreamOptions): Promise<AIResponse>;

  /**
   * Check if the service is configured and ready
   */
  isReady(): boolean;

  /**
   * Get the provider name
   */
  getProvider(): 'anthropic' | 'openai';
}

/**
 * Error thrown by AI services
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: 'anthropic' | 'openai',
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

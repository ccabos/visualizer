/**
 * Chat hook for AI Explorer
 */

import { useState, useCallback } from 'react';
import { ChatMessageData } from '../components/ai/ChatMessage';
import {
  createAIService,
  isAIAvailable,
  explorationTools,
  ToolExecutor,
  EXPLORER_SYSTEM_PROMPT,
  Message,
  ToolCall,
} from '../services/ai';
import { useQueryStore } from '../store/queryStore';
import { CanonicalQuery } from '../types/query';

interface UseChatOptions {
  onVisualizationCreated?: (query: CanonicalQuery) => void;
}

interface UseChatReturn {
  messages: ChatMessageData[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  isAvailable: boolean;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setQuery } = useQueryStore();

  // Handle visualization creation
  const handleVisualization = useCallback(
    (query: CanonicalQuery) => {
      setQuery(query);
      options?.onVisualizationCreated?.(query);
    },
    [setQuery, options]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!isAIAvailable()) {
        setError('AI is not configured. Please add an API key in Settings.');
        return;
      }

      // Create user message
      const userMessage: ChatMessageData = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Create assistant message placeholder
      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: ChatMessageData = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolCalls: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const aiService = createAIService();
        if (!aiService) {
          throw new Error('Failed to create AI service');
        }

        const toolExecutor = new ToolExecutor(handleVisualization);

        // Build conversation history
        const conversationMessages: Message[] = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Add the new user message
        conversationMessages.push({
          role: 'user',
          content,
        });

        let currentResponse = await aiService.stream({
          messages: conversationMessages,
          tools: explorationTools,
          systemPrompt: EXPLORER_SYSTEM_PROMPT,
          onChunk: (chunk) => {
            if (chunk.type === 'text' && chunk.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + chunk.content }
                    : m
                )
              );
            } else if (chunk.type === 'tool_call_start' && chunk.toolCall) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls || []),
                          {
                            name: chunk.toolCall!.name || 'unknown',
                            status: 'running' as const,
                          },
                        ],
                      }
                    : m
                )
              );
            }
          },
        });

        // Handle tool calls
        while (currentResponse.finishReason === 'tool_use' && currentResponse.toolCalls.length > 0) {
          const toolResults = await Promise.all(
            currentResponse.toolCalls.map(async (toolCall: ToolCall) => {
              // Update tool status to running
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls?.map((tc) =>
                          tc.name === toolCall.name ? { ...tc, status: 'running' as const } : tc
                        ),
                      }
                    : m
                )
              );

              const result = await toolExecutor.execute(toolCall.name, toolCall.arguments);

              // Update tool status to completed or error
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls?.map((tc) =>
                          tc.name === toolCall.name
                            ? {
                                ...tc,
                                status: result.isError ? ('error' as const) : ('completed' as const),
                                result: result.isError ? String(result.result) : undefined,
                              }
                            : tc
                        ),
                      }
                    : m
                )
              );

              return {
                toolCallId: toolCall.id,
                result: result.result,
                isError: result.isError,
              };
            })
          );

          // Continue the conversation with tool results
          // Include tool_calls in the assistant message (required by OpenAI)
          conversationMessages.push({
            role: 'assistant',
            content: currentResponse.content || '',
            toolCalls: currentResponse.toolCalls,
          });

          // Create a new streaming response
          let continueContent = '';
          currentResponse = await aiService.stream({
            messages: conversationMessages,
            tools: explorationTools,
            toolResults,
            systemPrompt: EXPLORER_SYSTEM_PROMPT,
            onChunk: (chunk) => {
              if (chunk.type === 'text' && chunk.content) {
                continueContent += chunk.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  )
                );
              } else if (chunk.type === 'tool_call_start' && chunk.toolCall) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          toolCalls: [
                            ...(m.toolCalls || []),
                            {
                              name: chunk.toolCall!.name || 'unknown',
                              status: 'running' as const,
                            },
                          ],
                        }
                      : m
                  )
                );
              }
            },
          });
        }

        // Finalize the message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        // Update the assistant message with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: m.content || `Error: ${errorMessage}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, handleVisualization]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    isAvailable: isAIAvailable(),
  };
}

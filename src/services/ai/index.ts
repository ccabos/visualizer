/**
 * AI Service exports and factory
 */

import { AIService } from './types';
import { ClaudeService } from './claude';
import { OpenAIService } from './openai';
import { useSettingsStore } from '../../store/settingsStore';

// Re-export types
export type {
  AIService,
  AIResponse,
  Message,
  ToolDefinition,
  ToolCall,
  ToolResult,
  CompletionOptions,
  StreamOptions,
  StreamChunk,
} from './types';

export { AIServiceError } from './types';

// Re-export implementations
export { ClaudeService } from './claude';
export { OpenAIService } from './openai';

// Re-export tools
export {
  explorationTools,
  ToolExecutor,
  EXPLORER_SYSTEM_PROMPT,
} from './tools';

/**
 * Create an AI service based on current settings
 */
export function createAIService(): AIService | null {
  const settings = useSettingsStore.getState();

  if (!settings.aiEnabled) {
    return null;
  }

  const provider = settings.getActiveProvider();

  if (provider === 'anthropic' && settings.anthropicApiKey) {
    return new ClaudeService(settings.anthropicApiKey);
  }

  if (provider === 'openai' && settings.openaiApiKey) {
    return new OpenAIService(settings.openaiApiKey);
  }

  return null;
}

/**
 * Check if AI services are available
 */
export function isAIAvailable(): boolean {
  const settings = useSettingsStore.getState();
  return settings.aiEnabled && settings.hasValidApiKey();
}

/**
 * Get the active AI provider name
 */
export function getActiveProviderName(): string | null {
  const settings = useSettingsStore.getState();
  const provider = settings.getActiveProvider();

  if (!provider) return null;

  return provider === 'anthropic' ? 'Claude' : 'ChatGPT';
}

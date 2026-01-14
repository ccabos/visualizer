/**
 * Tests for settings store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore, _testing } from './settingsStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('settingsStore', () => {
  beforeEach(() => {
    // Clear localStorage mock and reset store
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset the store state
    useSettingsStore.setState({
      anthropicApiKey: null,
      openaiApiKey: null,
      preferredAiProvider: null,
      aiEnabled: true,
      theme: 'system',
    });
  });

  describe('obfuscation functions', () => {
    it('should obfuscate and deobfuscate strings correctly', () => {
      const original = 'sk-ant-api03-test-key';
      const obfuscated = _testing.obfuscate(original);
      const deobfuscated = _testing.deobfuscate(obfuscated);

      expect(obfuscated).not.toBe(original);
      expect(deobfuscated).toBe(original);
    });

    it('should handle empty strings', () => {
      const original = '';
      const obfuscated = _testing.obfuscate(original);
      const deobfuscated = _testing.deobfuscate(obfuscated);

      expect(deobfuscated).toBe(original);
    });

    it('should handle special characters', () => {
      const original = 'sk-!@#$%^&*()_+-=[]{}|;:,.<>?';
      const obfuscated = _testing.obfuscate(original);
      const deobfuscated = _testing.deobfuscate(obfuscated);

      expect(deobfuscated).toBe(original);
    });
  });

  describe('initial state', () => {
    it('should have null API keys initially', () => {
      const state = useSettingsStore.getState();
      expect(state.anthropicApiKey).toBeNull();
      expect(state.openaiApiKey).toBeNull();
    });

    it('should have AI enabled by default', () => {
      const state = useSettingsStore.getState();
      expect(state.aiEnabled).toBe(true);
    });

    it('should have system theme by default', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
    });

    it('should have no preferred provider initially', () => {
      const state = useSettingsStore.getState();
      expect(state.preferredAiProvider).toBeNull();
    });
  });

  describe('setAnthropicApiKey', () => {
    it('should set Anthropic API key', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test-key');

      const state = useSettingsStore.getState();
      expect(state.anthropicApiKey).toBe('sk-ant-test-key');
    });

    it('should clear Anthropic API key when set to null', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test-key');
      setAnthropicApiKey(null);

      const state = useSettingsStore.getState();
      expect(state.anthropicApiKey).toBeNull();
    });
  });

  describe('setOpenaiApiKey', () => {
    it('should set OpenAI API key', () => {
      const { setOpenaiApiKey } = useSettingsStore.getState();
      setOpenaiApiKey('sk-openai-test-key');

      const state = useSettingsStore.getState();
      expect(state.openaiApiKey).toBe('sk-openai-test-key');
    });

    it('should clear OpenAI API key when set to null', () => {
      const { setOpenaiApiKey } = useSettingsStore.getState();
      setOpenaiApiKey('sk-openai-test-key');
      setOpenaiApiKey(null);

      const state = useSettingsStore.getState();
      expect(state.openaiApiKey).toBeNull();
    });
  });

  describe('setPreferredAiProvider', () => {
    it('should set preferred AI provider to anthropic', () => {
      const { setPreferredAiProvider } = useSettingsStore.getState();
      setPreferredAiProvider('anthropic');

      const state = useSettingsStore.getState();
      expect(state.preferredAiProvider).toBe('anthropic');
    });

    it('should set preferred AI provider to openai', () => {
      const { setPreferredAiProvider } = useSettingsStore.getState();
      setPreferredAiProvider('openai');

      const state = useSettingsStore.getState();
      expect(state.preferredAiProvider).toBe('openai');
    });

    it('should clear preferred provider when set to null', () => {
      const { setPreferredAiProvider } = useSettingsStore.getState();
      setPreferredAiProvider('anthropic');
      setPreferredAiProvider(null);

      const state = useSettingsStore.getState();
      expect(state.preferredAiProvider).toBeNull();
    });
  });

  describe('setAiEnabled', () => {
    it('should enable AI features', () => {
      const { setAiEnabled } = useSettingsStore.getState();
      setAiEnabled(false);
      setAiEnabled(true);

      const state = useSettingsStore.getState();
      expect(state.aiEnabled).toBe(true);
    });

    it('should disable AI features', () => {
      const { setAiEnabled } = useSettingsStore.getState();
      setAiEnabled(false);

      const state = useSettingsStore.getState();
      expect(state.aiEnabled).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('light');

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('light');
    });

    it('should set theme to dark', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should set theme to system', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('light');
      setTheme('system');

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
    });
  });

  describe('hasValidApiKey', () => {
    it('should return false when no keys are set', () => {
      const { hasValidApiKey } = useSettingsStore.getState();
      expect(hasValidApiKey()).toBe(false);
    });

    it('should return true when Anthropic key is set', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test');
      expect(useSettingsStore.getState().hasValidApiKey()).toBe(true);
    });

    it('should return true when OpenAI key is set', () => {
      const { setOpenaiApiKey } = useSettingsStore.getState();
      setOpenaiApiKey('sk-openai-test');
      expect(useSettingsStore.getState().hasValidApiKey()).toBe(true);
    });

    it('should return true when both keys are set', () => {
      const { setAnthropicApiKey, setOpenaiApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test');
      setOpenaiApiKey('sk-openai-test');
      expect(useSettingsStore.getState().hasValidApiKey()).toBe(true);
    });
  });

  describe('getActiveProvider', () => {
    it('should return null when no keys are set', () => {
      const { getActiveProvider } = useSettingsStore.getState();
      expect(getActiveProvider()).toBeNull();
    });

    it('should return anthropic when only Anthropic key is set', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test');
      expect(useSettingsStore.getState().getActiveProvider()).toBe('anthropic');
    });

    it('should return openai when only OpenAI key is set', () => {
      const { setOpenaiApiKey } = useSettingsStore.getState();
      setOpenaiApiKey('sk-openai-test');
      expect(useSettingsStore.getState().getActiveProvider()).toBe('openai');
    });

    it('should return anthropic by default when both keys are set', () => {
      const { setAnthropicApiKey, setOpenaiApiKey } = useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test');
      setOpenaiApiKey('sk-openai-test');
      expect(useSettingsStore.getState().getActiveProvider()).toBe('anthropic');
    });

    it('should respect preferred provider when set', () => {
      const { setAnthropicApiKey, setOpenaiApiKey, setPreferredAiProvider } =
        useSettingsStore.getState();
      setAnthropicApiKey('sk-ant-test');
      setOpenaiApiKey('sk-openai-test');
      setPreferredAiProvider('openai');
      expect(useSettingsStore.getState().getActiveProvider()).toBe('openai');
    });

    it('should fall back to available key if preferred provider has no key', () => {
      const { setOpenaiApiKey, setPreferredAiProvider } = useSettingsStore.getState();
      setOpenaiApiKey('sk-openai-test');
      setPreferredAiProvider('anthropic'); // No Anthropic key set
      expect(useSettingsStore.getState().getActiveProvider()).toBe('openai');
    });
  });

  describe('clearAllData', () => {
    it('should reset all state to initial values', () => {
      const {
        setAnthropicApiKey,
        setOpenaiApiKey,
        setPreferredAiProvider,
        setAiEnabled,
        setTheme,
        clearAllData,
      } = useSettingsStore.getState();

      // Set various values
      setAnthropicApiKey('sk-ant-test');
      setOpenaiApiKey('sk-openai-test');
      setPreferredAiProvider('openai');
      setAiEnabled(false);
      setTheme('dark');

      // Clear all data
      clearAllData();

      const state = useSettingsStore.getState();
      expect(state.anthropicApiKey).toBeNull();
      expect(state.openaiApiKey).toBeNull();
      expect(state.preferredAiProvider).toBeNull();
      expect(state.aiEnabled).toBe(true);
      expect(state.theme).toBe('system');
    });
  });
});

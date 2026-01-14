/**
 * Settings store for API keys and configuration
 * Uses Zustand with localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export type AIProvider = 'anthropic' | 'openai';

interface SettingsState {
  // API Keys (stored obfuscated in localStorage)
  anthropicApiKey: string | null;
  openaiApiKey: string | null;

  // AI Configuration
  preferredAiProvider: AIProvider | null;
  aiEnabled: boolean;

  // UI Preferences
  theme: 'light' | 'dark' | 'system';
}

interface SettingsActions {
  setAnthropicApiKey: (key: string | null) => void;
  setOpenaiApiKey: (key: string | null) => void;
  setPreferredAiProvider: (provider: AIProvider | null) => void;
  setAiEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  clearAllData: () => void;
  hasValidApiKey: () => boolean;
  getActiveProvider: () => AIProvider | null;
}

const initialState: SettingsState = {
  anthropicApiKey: null,
  openaiApiKey: null,
  preferredAiProvider: null,
  aiEnabled: true,
  theme: 'system',
};

/**
 * Simple obfuscation for API keys in localStorage
 * Note: This is NOT encryption - it just prevents casual inspection
 * API keys are still visible to anyone with browser dev tools
 */
function obfuscate(value: string): string {
  return btoa(value.split('').reverse().join(''));
}

function deobfuscate(value: string): string {
  try {
    return atob(value).split('').reverse().join('');
  } catch {
    return value; // Return as-is if deobfuscation fails
  }
}

/**
 * Custom storage that obfuscates sensitive values
 */
const obfuscatedStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      // Deobfuscate API keys when reading
      if (parsed.state?.anthropicApiKey) {
        parsed.state.anthropicApiKey = deobfuscate(parsed.state.anthropicApiKey);
      }
      if (parsed.state?.openaiApiKey) {
        parsed.state.openaiApiKey = deobfuscate(parsed.state.openaiApiKey);
      }
      return JSON.stringify(parsed);
    } catch {
      return value;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      // Obfuscate API keys when storing
      if (parsed.state?.anthropicApiKey) {
        parsed.state.anthropicApiKey = obfuscate(parsed.state.anthropicApiKey);
      }
      if (parsed.state?.openaiApiKey) {
        parsed.state.openaiApiKey = obfuscate(parsed.state.openaiApiKey);
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),

      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),

      setPreferredAiProvider: (provider) => set({ preferredAiProvider: provider }),

      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),

      setTheme: (theme) => set({ theme }),

      clearAllData: () => {
        set(initialState);
        // Also clear any cached data
        localStorage.removeItem('visualizer-history');
        localStorage.removeItem('visualizer-cache');
      },

      hasValidApiKey: () => {
        const state = get();
        return !!(state.anthropicApiKey || state.openaiApiKey);
      },

      getActiveProvider: () => {
        const state = get();

        // If a preferred provider is set and has a key, use it
        if (state.preferredAiProvider === 'anthropic' && state.anthropicApiKey) {
          return 'anthropic';
        }
        if (state.preferredAiProvider === 'openai' && state.openaiApiKey) {
          return 'openai';
        }

        // Otherwise, return whichever has a key (prefer anthropic)
        if (state.anthropicApiKey) return 'anthropic';
        if (state.openaiApiKey) return 'openai';

        return null;
      },
    }),
    {
      name: 'visualizer-settings',
      storage: createJSONStorage(() => obfuscatedStorage),
      partialize: (state) => ({
        anthropicApiKey: state.anthropicApiKey,
        openaiApiKey: state.openaiApiKey,
        preferredAiProvider: state.preferredAiProvider,
        aiEnabled: state.aiEnabled,
        theme: state.theme,
      } as SettingsState & SettingsActions),
    }
  )
);

// Export obfuscation functions for testing
export const _testing = { obfuscate, deobfuscate };

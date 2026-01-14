/**
 * Settings page - API key configuration and preferences
 */

import { useState, useCallback } from 'react';
import { useSettingsStore, AIProvider } from '../store/settingsStore';
import styles from './Pages.module.css';

export function SettingsPage() {
  const {
    anthropicApiKey,
    openaiApiKey,
    preferredAiProvider,
    aiEnabled,
    setAnthropicApiKey,
    setOpenaiApiKey,
    setPreferredAiProvider,
    setAiEnabled,
    clearAllData,
    hasValidApiKey,
  } = useSettingsStore();

  // Local state for input fields (to avoid storing partial keys)
  const [anthropicInput, setAnthropicInput] = useState(anthropicApiKey || '');
  const [openaiInput, setOpenaiInput] = useState(openaiApiKey || '');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveAnthropicKey = useCallback(() => {
    const trimmed = anthropicInput.trim();
    setAnthropicApiKey(trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [anthropicInput, setAnthropicApiKey]);

  const handleSaveOpenaiKey = useCallback(() => {
    const trimmed = openaiInput.trim();
    setOpenaiApiKey(trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [openaiInput, setOpenaiApiKey]);

  const handleClearData = useCallback(() => {
    if (window.confirm('This will clear all saved API keys, history, and cached data. Continue?')) {
      clearAllData();
      setAnthropicInput('');
      setOpenaiInput('');
    }
  }, [clearAllData]);

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
  };

  const AI_PROVIDERS: { id: AIProvider; label: string; description: string }[] = [
    { id: 'anthropic', label: 'Claude (Anthropic)', description: 'Claude 3.5 Sonnet - Best for complex reasoning' },
    { id: 'openai', label: 'ChatGPT (OpenAI)', description: 'GPT-4 - Good general performance' },
  ];

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Settings</h2>

      {/* Security notice */}
      <div className={styles.section}>
        <div className={styles.warningBox}>
          <strong>Security Notice:</strong> API keys are stored locally in your browser.
          They are never sent to any server. However, anyone with access to this browser
          can retrieve them. Clear your data before using a shared computer.
        </div>
      </div>

      {/* AI Features Toggle */}
      <div className={styles.section}>
        <label className={styles.label}>AI Features</label>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Enable AI-powered data exploration</span>
          <button
            className={`${styles.toggle} ${aiEnabled ? styles.toggleOn : ''}`}
            onClick={() => setAiEnabled(!aiEnabled)}
            aria-label={aiEnabled ? 'Disable AI features' : 'Enable AI features'}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
        {!hasValidApiKey() && aiEnabled && (
          <p className={styles.helperText}>
            Add an API key below to use AI features.
          </p>
        )}
      </div>

      {/* Anthropic API Key */}
      <div className={styles.section}>
        <label className={styles.label}>Anthropic API Key</label>
        <p className={styles.helperText}>
          Get your API key from{' '}
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>
        </p>
        <div className={styles.apiKeyRow}>
          <input
            type={showAnthropicKey ? 'text' : 'password'}
            className={styles.input}
            placeholder="sk-ant-..."
            value={anthropicInput}
            onChange={(e) => setAnthropicInput(e.target.value)}
          />
          <button
            className={styles.iconButton}
            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
            aria-label={showAnthropicKey ? 'Hide key' : 'Show key'}
          >
            {showAnthropicKey ? '🙈' : '👁'}
          </button>
        </div>
        <div className={styles.buttonRow}>
          <button
            className={styles.button}
            onClick={handleSaveAnthropicKey}
          >
            Save Anthropic Key
          </button>
          {anthropicApiKey && (
            <button
              className={styles.textButton}
              onClick={() => {
                setAnthropicApiKey(null);
                setAnthropicInput('');
              }}
            >
              Remove
            </button>
          )}
        </div>
        {anthropicApiKey && (
          <p className={styles.savedKeyInfo}>
            Saved: {maskApiKey(anthropicApiKey)}
          </p>
        )}
      </div>

      {/* OpenAI API Key */}
      <div className={styles.section}>
        <label className={styles.label}>OpenAI API Key</label>
        <p className={styles.helperText}>
          Get your API key from{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            platform.openai.com
          </a>
        </p>
        <div className={styles.apiKeyRow}>
          <input
            type={showOpenaiKey ? 'text' : 'password'}
            className={styles.input}
            placeholder="sk-..."
            value={openaiInput}
            onChange={(e) => setOpenaiInput(e.target.value)}
          />
          <button
            className={styles.iconButton}
            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
            aria-label={showOpenaiKey ? 'Hide key' : 'Show key'}
          >
            {showOpenaiKey ? '🙈' : '👁'}
          </button>
        </div>
        <div className={styles.buttonRow}>
          <button
            className={styles.button}
            onClick={handleSaveOpenaiKey}
          >
            Save OpenAI Key
          </button>
          {openaiApiKey && (
            <button
              className={styles.textButton}
              onClick={() => {
                setOpenaiApiKey(null);
                setOpenaiInput('');
              }}
            >
              Remove
            </button>
          )}
        </div>
        {openaiApiKey && (
          <p className={styles.savedKeyInfo}>
            Saved: {maskApiKey(openaiApiKey)}
          </p>
        )}
      </div>

      {/* Preferred Provider */}
      {hasValidApiKey() && (
        <div className={styles.section}>
          <label className={styles.label}>Preferred AI Provider</label>
          <div className={styles.providerList}>
            {AI_PROVIDERS.map((provider) => {
              const hasKey = provider.id === 'anthropic' ? anthropicApiKey : openaiApiKey;
              return (
                <button
                  key={provider.id}
                  className={`${styles.providerItem} ${
                    preferredAiProvider === provider.id ? styles.providerItemActive : ''
                  } ${!hasKey ? styles.providerItemDisabled : ''}`}
                  onClick={() => hasKey && setPreferredAiProvider(provider.id)}
                  disabled={!hasKey}
                >
                  <div className={styles.providerHeader}>
                    <span className={styles.providerLabel}>{provider.label}</span>
                    {preferredAiProvider === provider.id && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </div>
                  <span className={styles.providerDescription}>{provider.description}</span>
                  {!hasKey && <span className={styles.providerMissing}>No API key</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save confirmation */}
      {saved && (
        <div className={styles.savedNotification}>
          Settings saved
        </div>
      )}

      {/* Clear data */}
      <div className={styles.section}>
        <label className={styles.label}>Data Management</label>
        <button
          className={styles.dangerButton}
          onClick={handleClearData}
        >
          Clear All Stored Data
        </button>
        <p className={styles.helperText}>
          This removes all API keys, query history, and cached data from your browser.
        </p>
      </div>
    </div>
  );
}

/**
 * AI Explorer page - Chat interface for data exploration
 */

import { useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChatMessage } from '../components/ai/ChatMessage';
import { ChatInput } from '../components/ai/ChatInput';
import { useChat } from '../hooks/useChat';
import { getActiveProviderName } from '../services/ai';
import styles from '../components/ai/Chat.module.css';

const SUGGESTIONS = [
  'Show me GDP per capita for G7 countries',
  'What population data is available?',
  'Compare life expectancy in Europe',
  'Find renewable energy statistics',
];

export function AIExplorerPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, isAvailable } = useChat({
    onVisualizationCreated: () => {
      // Navigate to chart view when visualization is created
      navigate('/chart');
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage]
  );

  // Not configured state
  if (!isAvailable) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.notConfigured}>
          <span className={styles.notConfiguredIcon}>&#x1F511;</span>
          <h2 className={styles.notConfiguredTitle}>AI Not Configured</h2>
          <p className={styles.notConfiguredText}>
            To use the AI Explorer, you need to configure an API key for Claude or ChatGPT in the settings.
          </p>
          <Link to="/settings" className={styles.configureButton}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  const providerName = getActiveProviderName();

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>&#x1F4AC;</span>
            <h2 className={styles.emptyTitle}>AI Data Explorer</h2>
            <p className={styles.emptyText}>
              Ask me about data and I'll help you find and visualize it. I can search across
              World Bank, Eurostat, Our World in Data, and Wikidata.
            </p>
            {providerName && (
              <span className={styles.providerBadge}>
                Powered by {providerName}
              </span>
            )}
            <div className={styles.suggestionChips}>
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  className={styles.suggestionChip}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {error && (
              <div className={styles.systemMessage}>
                <span className={styles.systemIcon}>!</span>
                <span className={styles.systemText}>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={isLoading ? 'Thinking...' : 'Ask about data...'}
      />
    </div>
  );
}

/**
 * Chat message component for AI Explorer
 */

import styles from './Chat.module.css';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    result?: string;
  }>;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className={styles.systemMessage}>
        <span className={styles.systemIcon}>i</span>
        <span className={styles.systemText}>{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
      <div className={styles.messageHeader}>
        <span className={styles.roleLabel}>{isUser ? 'You' : 'AI Assistant'}</span>
        <span className={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className={styles.messageContent}>
        {message.content ? (
          <div className={styles.messageText}>
            {message.content.split('\n').map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </div>
        ) : message.isStreaming ? (
          <div className={styles.streamingIndicator}>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
          </div>
        ) : null}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className={styles.toolCalls}>
            {message.toolCalls.map((tool, index) => (
              <ToolCallItem key={index} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ToolCallItemProps {
  tool: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    result?: string;
  };
}

function ToolCallItem({ tool }: ToolCallItemProps) {
  const getStatusIcon = () => {
    switch (tool.status) {
      case 'pending':
        return '...';
      case 'running':
        return '...';
      case 'completed':
        return '...';
      case 'error':
        return '!';
      default:
        return '?';
    }
  };

  const getToolLabel = (name: string): string => {
    const labels: Record<string, string> = {
      search_indicators: 'Searching indicators',
      search_wikidata_entities: 'Searching entities',
      get_wikidata_properties: 'Getting properties',
      execute_sparql: 'Running SPARQL query',
      create_visualization: 'Creating chart',
      list_curated_indicators: 'Listing indicators',
    };
    return labels[name] || name;
  };

  return (
    <div className={`${styles.toolCall} ${styles[`toolCall_${tool.status}`]}`}>
      <span className={styles.toolIcon}>{getStatusIcon()}</span>
      <span className={styles.toolName}>{getToolLabel(tool.name)}</span>
      {tool.status === 'running' && (
        <span className={styles.toolSpinner}></span>
      )}
      {tool.status === 'completed' && (
        <span className={styles.toolCheck}>Done</span>
      )}
      {tool.status === 'error' && tool.result && (
        <span className={styles.toolError}>{tool.result}</span>
      )}
    </div>
  );
}

/**
 * Provenance card component
 */

import { useState } from 'react';
import { Provenance } from '../../types/dataset';
import styles from './Provenance.module.css';

interface ProvenanceCardProps {
  provenance: Provenance;
}

export function ProvenanceCard({ provenance }: ProvenanceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className={styles.card}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className={styles.headerText}>
          Source: {provenance.sourceName}
        </span>
        <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={styles.content}>
          <div className={styles.row}>
            <span className={styles.label}>Source ID:</span>
            <span className={styles.value}>{provenance.sourceId}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Retrieved:</span>
            <span className={styles.value}>
              {formatDate(provenance.retrievedAt)}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Query URL:</span>
            <a
              href={provenance.queryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View raw data
            </a>
          </div>

          <div className={styles.attribution}>
            <p className={styles.attributionText}>
              {provenance.attribution.text}
            </p>
            <p className={styles.license}>License: {provenance.attribution.license}</p>
            {provenance.attribution.url && (
              <a
                href={provenance.attribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                More information
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

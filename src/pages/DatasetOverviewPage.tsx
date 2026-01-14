/**
 * Dataset overview page
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableTopics, searchCatalog } from '../data/catalog/curated-indicators';
import { useQueryStore } from '../store/queryStore';
import { useHistoryStore } from '../store/historyStore';
import { CatalogEntry } from '../types/catalog';
import styles from './Pages.module.css';

export function DatasetOverviewPage() {
  const navigate = useNavigate();
  const { createQuery } = useQueryStore();
  const { addFavoriteIndicator, removeFavoriteIndicator, isFavoriteIndicator } =
    useHistoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | undefined>();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const topics = useMemo(() => getAvailableTopics(), []);

  const filteredIndicators = useMemo(() => {
    return searchCatalog(searchTerm, {
      sourceId: selectedSource,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    });
  }, [searchTerm, selectedSource, selectedTopics]);

  const handleQuickPlot = (indicator: CatalogEntry) => {
    const exampleQuery = indicator.exampleQuery;
    createQuery({
      sourceId: indicator.sourceId,
      queryType: exampleQuery?.queryType || 'time_series',
      indicatorId: indicator.indicatorId,
      indicatorLabel: indicator.title,
      entities: exampleQuery?.entities || ['DEU'],
      startYear: exampleQuery?.timeRange.start || '2000',
      endYear: exampleQuery?.timeRange.end || '2023',
      chartType: 'line',
      unit: indicator.unit,
    });
    navigate('/chart');
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleFavorite = (indicator: CatalogEntry) => {
    if (isFavoriteIndicator(indicator.indicatorId)) {
      removeFavoriteIndicator(indicator.indicatorId);
    } else {
      addFavoriteIndicator(indicator);
    }
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Browse Datasets</h2>

      {/* Search */}
      <div className={styles.section}>
        <input
          type="text"
          className={styles.input}
          placeholder="Search indicators, topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Source filter */}
      <div className={styles.section}>
        <label className={styles.label}>Source</label>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${!selectedSource ? styles.buttonActive : ''}`}
            onClick={() => setSelectedSource(undefined)}
          >
            All
          </button>
          <button
            className={`${styles.button} ${selectedSource === 'worldbank' ? styles.buttonActive : ''}`}
            onClick={() => setSelectedSource('worldbank')}
          >
            World Bank
          </button>
          <button
            className={`${styles.button} ${selectedSource === 'owid' ? styles.buttonActive : ''}`}
            onClick={() => setSelectedSource('owid')}
          >
            OWID
          </button>
          <button
            className={`${styles.button} ${selectedSource === 'eurostat' ? styles.buttonActive : ''}`}
            onClick={() => setSelectedSource('eurostat')}
          >
            Eurostat
          </button>
        </div>
      </div>

      {/* Topic filter */}
      <div className={styles.section}>
        <label className={styles.label}>Topics</label>
        <div className={styles.chipGroup}>
          {topics.map((topic) => (
            <button
              key={topic}
              className={`${styles.chip} ${
                selectedTopics.includes(topic) ? styles.chipActive : ''
              }`}
              onClick={() => toggleTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className={styles.section}>
        <label className={styles.label}>
          Indicators ({filteredIndicators.length})
        </label>
        <div className={styles.datasetList}>
          {filteredIndicators.map((indicator) => (
            <div key={indicator.indicatorId} className={styles.datasetCard}>
              <div className={styles.datasetHeader}>
                <h3 className={styles.datasetTitle}>{indicator.title}</h3>
                <button
                  className={styles.favoriteButton}
                  onClick={() => toggleFavorite(indicator)}
                  title={
                    isFavoriteIndicator(indicator.indicatorId)
                      ? 'Remove from favorites'
                      : 'Add to favorites'
                  }
                >
                  {isFavoriteIndicator(indicator.indicatorId) ? '★' : '☆'}
                </button>
              </div>
              <p className={styles.datasetDescription}>{indicator.description}</p>
              <div className={styles.datasetMeta}>
                <span className={styles.datasetSource}>{indicator.sourceName}</span>
                {indicator.unit && (
                  <span className={styles.datasetUnit}>Unit: {indicator.unit}</span>
                )}
              </div>
              <div className={styles.datasetTopics}>
                {indicator.topics.map((topic) => (
                  <span key={topic} className={styles.topicTag}>
                    {topic}
                  </span>
                ))}
              </div>
              <button
                className={styles.quickPlotButton}
                onClick={() => handleQuickPlot(indicator)}
              >
                Quick Plot
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

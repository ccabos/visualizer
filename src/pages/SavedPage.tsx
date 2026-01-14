/**
 * Saved charts and favorites page
 */

import { useNavigate } from 'react-router-dom';
import { useHistoryStore } from '../store/historyStore';
import { useQueryStore } from '../store/queryStore';
import styles from './Pages.module.css';

export function SavedPage() {
  const navigate = useNavigate();
  const { setQuery } = useQueryStore();
  const {
    recentCharts,
    favoriteIndicators,
    removeRecentChart,
    clearHistory,
    removeFavoriteIndicator,
  } = useHistoryStore();

  const handleOpenChart = (item: (typeof recentCharts)[0]) => {
    setQuery(item.query);
    navigate('/chart');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Saved</h2>

      {/* Recent charts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <label className={styles.label}>Recent Charts</label>
          {recentCharts.length > 0 && (
            <button className={styles.textButton} onClick={clearHistory}>
              Clear All
            </button>
          )}
        </div>

        {recentCharts.length === 0 ? (
          <p className={styles.emptyText}>No recent charts yet.</p>
        ) : (
          <div className={styles.historyList}>
            {recentCharts.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <button
                  className={styles.historyContent}
                  onClick={() => handleOpenChart(item)}
                >
                  <span className={styles.historyTitle}>{item.title}</span>
                  <span className={styles.historyMeta}>
                    {item.query.entities.slice(0, 3).join(', ')}
                    {item.query.entities.length > 3 &&
                      ` +${item.query.entities.length - 3}`}
                  </span>
                  <span className={styles.historyDate}>
                    {formatDate(item.timestamp)}
                  </span>
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => removeRecentChart(item.id)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Favorite indicators */}
      <div className={styles.section}>
        <label className={styles.label}>Favorite Indicators</label>

        {favoriteIndicators.length === 0 ? (
          <p className={styles.emptyText}>
            No favorite indicators yet. Star indicators in the Data tab.
          </p>
        ) : (
          <div className={styles.favoritesList}>
            {favoriteIndicators.map((indicator) => (
              <div key={indicator.indicatorId} className={styles.favoriteItem}>
                <div className={styles.favoriteContent}>
                  <span className={styles.favoriteTitle}>{indicator.title}</span>
                  <span className={styles.favoriteMeta}>
                    {indicator.sourceName}
                  </span>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => removeFavoriteIndicator(indicator.indicatorId)}
                  title="Remove from favorites"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

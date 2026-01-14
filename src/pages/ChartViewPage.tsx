/**
 * Chart view page
 */

import React, { useMemo } from 'react';
import { useQueryStore } from '../store/queryStore';
import { useDataFetch } from '../hooks/useDataFetch';
import { useUrlState } from '../hooks/useUrlState';
import { useHistoryStore } from '../store/historyStore';
import { LineChart, BarChart, ScatterChart } from '../components/charts';
import { ProvenanceCard } from '../components/provenance/ProvenanceCard';
import { downloadCsv, exportSvgToPng, copyToClipboard } from '../services/export';
import { TimeSeriesDataset, CrossSectionDataset, ScatterDataset } from '../types/dataset';
import styles from './Pages.module.css';

export function ChartViewPage() {
  const { query } = useQueryStore();
  const { data, isLoading, error, refetch } = useDataFetch(query);
  const { getShareUrl } = useUrlState();
  const { addRecentChart } = useHistoryStore();

  // Add to history when data loads
  React.useEffect(() => {
    if (data && query) {
      const title = query.y[0]?.label || 'Chart';
      addRecentChart(query, title);
    }
  }, [data, query, addRecentChart]);

  const handleExportCsv = () => {
    if (data) {
      const filename = `data-${query?.y[0]?.indicatorId || 'export'}-${Date.now()}`;
      downloadCsv(data, filename);
    }
  };

  const handleExportPng = async () => {
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const filename = `chart-${query?.y[0]?.indicatorId || 'export'}-${Date.now()}`;
      await exportSvgToPng(svgElement as SVGSVGElement, filename);
    }
  };

  const handleShare = async () => {
    const url = getShareUrl();
    if (url) {
      const success = await copyToClipboard(url);
      if (success) {
        alert('Share URL copied to clipboard!');
      } else {
        alert('Failed to copy URL. Please copy manually: ' + url);
      }
    }
  };

  // Render the appropriate chart based on data type
  const chartElement = useMemo(() => {
    if (!data) return null;

    const chartType = query?.render.chartType || 'line';

    if (data.kind === 'ScatterDataset') {
      return <ScatterChart data={data as ScatterDataset} />;
    }

    if (chartType === 'bar') {
      return <BarChart data={data as CrossSectionDataset | TimeSeriesDataset} horizontal />;
    }

    return <LineChart data={data as TimeSeriesDataset} />;
  }, [data, query?.render.chartType]);

  if (!query) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>No Chart</h2>
          <p>Go to the Build tab to create a chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>{query.y[0]?.label || 'Chart'}</h2>
        <div className={styles.chartActions}>
          <button className={styles.iconButton} onClick={refetch} title="Refresh">
            &#x21BB;
          </button>
          <button className={styles.iconButton} onClick={handleShare} title="Share">
            &#x1F517;
          </button>
        </div>
      </div>

      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading data...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <h3>Error</h3>
          <p>{error}</p>
          <button className={styles.button} onClick={refetch}>
            Try Again
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className={styles.chartContainer}>{chartElement}</div>

          <div className={styles.exportButtons}>
            <button className={styles.button} onClick={handleExportCsv}>
              Export CSV
            </button>
            <button className={styles.button} onClick={handleExportPng}>
              Export PNG
            </button>
          </div>

          <ProvenanceCard provenance={data.provenance} />
        </>
      )}
    </div>
  );
}

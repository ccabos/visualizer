/**
 * Home page - Chart builder
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryStore } from '../store/queryStore';
import { curatedIndicators } from '../data/catalog/curated-indicators';
import { ChartType } from '../types/query';
import styles from './Pages.module.css';

const SOURCES = [
  { id: 'worldbank', label: 'World Bank' },
  { id: 'owid', label: 'Our World in Data' },
  { id: 'eurostat', label: 'Eurostat' },
];

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'line', label: 'Line Chart' },
  { id: 'bar', label: 'Bar Chart' },
  { id: 'scatter', label: 'Scatter Plot' },
];

const COMMON_ENTITIES = [
  { id: 'DEU', label: 'Germany' },
  { id: 'FRA', label: 'France' },
  { id: 'USA', label: 'United States' },
  { id: 'GBR', label: 'United Kingdom' },
  { id: 'CHN', label: 'China' },
  { id: 'JPN', label: 'Japan' },
  { id: 'IND', label: 'India' },
  { id: 'BRA', label: 'Brazil' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { createQuery } = useQueryStore();

  const [sourceId, setSourceId] = useState('worldbank');
  const [indicatorId, setIndicatorId] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>(['DEU', 'FRA']);
  const [startYear, setStartYear] = useState('2000');
  const [endYear, setEndYear] = useState('2023');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter indicators by source and search term
  const filteredIndicators = curatedIndicators.filter(
    (ind) =>
      ind.sourceId === sourceId &&
      (searchTerm === '' ||
        ind.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.indicatorId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleEntity = useCallback((entityId: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  }, []);

  const handlePlot = useCallback(() => {
    if (!indicatorId || selectedEntities.length === 0) {
      alert('Please select an indicator and at least one country.');
      return;
    }

    const indicator = curatedIndicators.find((i) => i.indicatorId === indicatorId);
    if (!indicator) return;

    createQuery({
      sourceId,
      queryType: chartType === 'scatter' ? 'scatter' : 'time_series',
      indicatorId,
      indicatorLabel: indicator.title,
      entities: selectedEntities,
      startYear,
      endYear,
      chartType,
      unit: indicator.unit,
    });

    navigate('/chart');
  }, [
    sourceId,
    indicatorId,
    selectedEntities,
    startYear,
    endYear,
    chartType,
    createQuery,
    navigate,
  ]);

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Build a Chart</h2>

      {/* Source selector */}
      <div className={styles.section}>
        <label className={styles.label}>Data Source</label>
        <div className={styles.buttonGroup}>
          {SOURCES.map((source) => (
            <button
              key={source.id}
              className={`${styles.button} ${
                sourceId === source.id ? styles.buttonActive : ''
              }`}
              onClick={() => {
                setSourceId(source.id);
                setIndicatorId('');
              }}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator search */}
      <div className={styles.section}>
        <label className={styles.label}>Indicator</label>
        <input
          type="text"
          className={styles.input}
          placeholder="Search indicators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={styles.indicatorList}>
          {filteredIndicators.slice(0, 10).map((ind) => (
            <button
              key={ind.indicatorId}
              className={`${styles.indicatorItem} ${
                indicatorId === ind.indicatorId ? styles.indicatorItemActive : ''
              }`}
              onClick={() => setIndicatorId(ind.indicatorId)}
            >
              <span className={styles.indicatorTitle}>{ind.title}</span>
              <span className={styles.indicatorMeta}>
                {ind.topics.slice(0, 2).join(', ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Entity selector */}
      <div className={styles.section}>
        <label className={styles.label}>Countries</label>
        <div className={styles.chipGroup}>
          {COMMON_ENTITIES.map((entity) => (
            <button
              key={entity.id}
              className={`${styles.chip} ${
                selectedEntities.includes(entity.id) ? styles.chipActive : ''
              }`}
              onClick={() => toggleEntity(entity.id)}
            >
              {entity.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time range */}
      <div className={styles.section}>
        <label className={styles.label}>Time Range</label>
        <div className={styles.timeRange}>
          <input
            type="number"
            className={styles.input}
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            min="1960"
            max="2025"
          />
          <span className={styles.timeRangeSeparator}>to</span>
          <input
            type="number"
            className={styles.input}
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
            min="1960"
            max="2025"
          />
        </div>
      </div>

      {/* Chart type */}
      <div className={styles.section}>
        <label className={styles.label}>Chart Type</label>
        <div className={styles.buttonGroup}>
          {CHART_TYPES.map((type) => (
            <button
              key={type.id}
              className={`${styles.button} ${
                chartType === type.id ? styles.buttonActive : ''
              }`}
              onClick={() => setChartType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plot button */}
      <button
        className={styles.primaryButton}
        onClick={handlePlot}
        disabled={!indicatorId || selectedEntities.length === 0}
      >
        Plot Chart
      </button>
    </div>
  );
}

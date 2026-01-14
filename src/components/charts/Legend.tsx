/**
 * Legend component for charts
 */

import styles from './Chart.module.css';

export interface LegendItem {
  id: string;
  label: string;
  color: string;
}

interface LegendProps {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
}

export function Legend({ items, orientation = 'horizontal' }: LegendProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={`${styles.legend} ${
        orientation === 'vertical' ? styles.legendVertical : ''
      }`}
    >
      {items.map((item) => (
        <div key={item.id} className={styles.legendItem}>
          <span
            className={styles.legendColor}
            style={{ backgroundColor: item.color }}
          />
          <span className={styles.legendLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tooltip component for charts
 */

import styles from './Chart.module.css';

export interface TooltipData {
  x: number;
  y: number;
  entity: string;
  time?: string;
  value?: number | null;
  unit?: string;
  // For scatter charts
  xValue?: number | null;
  yValue?: number | null;
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
}

interface TooltipProps {
  data: TooltipData;
}

/**
 * Format a number for display
 */
function formatValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return 'N/A';

  let formatted: string;
  if (Math.abs(value) >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + 'B';
  } else if (Math.abs(value) >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + 'M';
  } else if (Math.abs(value) >= 1_000) {
    formatted = (value / 1_000).toFixed(2) + 'K';
  } else if (Math.abs(value) < 1 && value !== 0) {
    formatted = value.toFixed(4);
  } else {
    formatted = value.toFixed(2);
  }

  return unit ? `${formatted} ${unit}` : formatted;
}

export function Tooltip({ data }: TooltipProps) {
  const offsetX = 15;
  const offsetY = -10;

  // Determine if this is a scatter tooltip or line/bar tooltip
  const isScatter = data.xValue !== undefined && data.yValue !== undefined;

  return (
    <div
      className={styles.tooltip}
      style={{
        left: data.x + offsetX,
        top: data.y + offsetY,
      }}
    >
      <div className={styles.tooltipTitle}>{data.entity}</div>
      {isScatter ? (
        <>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>{data.xLabel}:</span>
            <span className={styles.tooltipValue}>
              {formatValue(data.xValue, data.xUnit)}
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>{data.yLabel}:</span>
            <span className={styles.tooltipValue}>
              {formatValue(data.yValue, data.yUnit)}
            </span>
          </div>
        </>
      ) : (
        <>
          {data.time && (
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Year:</span>
              <span className={styles.tooltipValue}>{data.time}</span>
            </div>
          )}
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Value:</span>
            <span className={styles.tooltipValue}>
              {formatValue(data.value, data.unit)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

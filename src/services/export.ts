/**
 * Export service for CSV and PNG exports
 */

import { NormalizedDataset, TimeSeriesDataset, CrossSectionDataset, ScatterDataset } from '../types/dataset';

/**
 * Generate CSV content from a normalized dataset
 */
export function datasetToCsv(data: NormalizedDataset): string {
  const lines: string[] = [];

  // Metadata header
  lines.push(`# Source: ${data.provenance.sourceName}`);
  lines.push(`# Query URL: ${data.provenance.queryUrl}`);
  lines.push(`# Retrieved: ${data.provenance.retrievedAt}`);
  lines.push(`# Attribution: ${data.provenance.attribution.text}`);
  lines.push(`# License: ${data.provenance.attribution.license}`);
  lines.push('');

  switch (data.kind) {
    case 'TimeSeriesDataset':
      lines.push(...timeSeriesDatasetToCsv(data));
      break;
    case 'CrossSectionDataset':
      lines.push(...crossSectionDatasetToCsv(data));
      break;
    case 'ScatterDataset':
      lines.push(...scatterDatasetToCsv(data));
      break;
  }

  return lines.join('\n');
}

function timeSeriesDatasetToCsv(data: TimeSeriesDataset): string[] {
  const lines: string[] = [];
  lines.push('Entity,EntityID,Indicator,Year,Value,Unit');

  for (const series of data.series) {
    for (const point of series.points) {
      if (point.v !== null) {
        lines.push(
          `"${escapeCSV(series.entityLabel)}","${series.entityId}","${escapeCSV(series.indicatorLabel)}",${point.t},${point.v},"${escapeCSV(series.unit)}"`
        );
      }
    }
  }

  return lines;
}

function crossSectionDatasetToCsv(data: CrossSectionDataset): string[] {
  const lines: string[] = [];
  lines.push(`# Indicator: ${data.indicatorLabel} (${data.indicatorId})`);
  lines.push(`# Year: ${data.time}`);
  lines.push('');
  lines.push('Entity,EntityID,Value,Unit');

  for (const row of data.rows) {
    if (row.value !== null) {
      lines.push(
        `"${escapeCSV(row.entityLabel)}","${row.entityId}",${row.value},"${escapeCSV(data.unit)}"`
      );
    }
  }

  return lines;
}

function scatterDatasetToCsv(data: ScatterDataset): string[] {
  const lines: string[] = [];
  lines.push(`# Year: ${data.time}`);
  lines.push(`# X-axis: ${data.x.label} (${data.x.indicatorId})`);
  lines.push(`# Y-axis: ${data.y.label} (${data.y.indicatorId})`);
  lines.push('');
  lines.push(`Entity,EntityID,${escapeCSV(data.x.label)},${escapeCSV(data.y.label)}`);

  for (const point of data.points) {
    if (point.x !== null && point.y !== null) {
      lines.push(
        `"${escapeCSV(point.entityLabel)}","${point.entityId}",${point.x},${point.y}`
      );
    }
  }

  return lines;
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(str: string): string {
  return str.replace(/"/g, '""');
}

/**
 * Download CSV file
 */
export function downloadCsv(data: NormalizedDataset, filename: string): void {
  const csvContent = datasetToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export SVG element to PNG
 */
export async function exportSvgToPng(
  svgElement: SVGSVGElement,
  filename: string,
  scale: number = 2
): Promise<void> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const width = svgElement.clientWidth || parseInt(svgElement.getAttribute('width') || '800');
      const height = svgElement.clientHeight || parseInt(svgElement.getAttribute('height') || '600');

      canvas.width = width * scale;
      canvas.height = height * scale;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `${filename}.png`);
          resolve();
        } else {
          reject(new Error('Could not create PNG blob'));
        }
      }, 'image/png');

      URL.revokeObjectURL(svgUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Could not load SVG image'));
    };

    img.src = svgUrl;
  });
}

/**
 * Generate a shareable URL for the current query state
 */
export function generateShareUrl(queryState: Record<string, unknown>): string {
  const stateJson = JSON.stringify(queryState);
  const encoded = btoa(encodeURIComponent(stateJson));
  // Make URL-safe
  const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/chart?q=${urlSafe}`;
}

/**
 * Parse a share URL query parameter
 */
export function parseShareUrl(encoded: string): Record<string, unknown> | null {
  try {
    // Restore base64 characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (base64.length % 4) {
      base64 += '=';
    }

    const decoded = decodeURIComponent(atob(base64));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

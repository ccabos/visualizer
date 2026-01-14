/**
 * Normalized dataset types for internal use
 */

import { AttributionConfig } from './source';

export interface Provenance {
  sourceId: string;
  sourceName: string;
  queryUrl: string;
  retrievedAt: string;
  attribution: AttributionConfig;
}

export interface DataPoint {
  t: string;
  v: number | null;
}

export interface SeriesData {
  entityId: string;
  entityLabel: string;
  indicatorId: string;
  indicatorLabel: string;
  points: DataPoint[];
  unit: string;
}

export interface TimeSeriesDataset {
  kind: 'TimeSeriesDataset';
  series: SeriesData[];
  provenance: Provenance;
}

export interface CrossSectionRow {
  entityId: string;
  entityLabel: string;
  value: number | null;
}

export interface CrossSectionDataset {
  kind: 'CrossSectionDataset';
  indicatorId: string;
  indicatorLabel: string;
  time: string;
  rows: CrossSectionRow[];
  unit: string;
  provenance: Provenance;
}

export interface ScatterPoint {
  entityId: string;
  entityLabel: string;
  x: number | null;
  y: number | null;
}

export interface ScatterAxisInfo {
  indicatorId: string;
  label: string;
  unit: string;
}

export interface ScatterDataset {
  kind: 'ScatterDataset';
  time: string;
  x: ScatterAxisInfo;
  y: ScatterAxisInfo;
  points: ScatterPoint[];
  provenance: Provenance;
}

export type NormalizedDataset = TimeSeriesDataset | CrossSectionDataset | ScatterDataset;

/**
 * History and favorites store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanonicalQuery } from '../types/query';
import { CatalogEntry } from '../types/catalog';

interface HistoryItem {
  id: string;
  query: CanonicalQuery;
  title: string;
  timestamp: number;
}

interface HistoryState {
  recentCharts: HistoryItem[];
  favoriteIndicators: CatalogEntry[];
  favoriteEntities: string[];
}

interface HistoryActions {
  addRecentChart: (query: CanonicalQuery, title: string) => void;
  removeRecentChart: (id: string) => void;
  clearHistory: () => void;
  addFavoriteIndicator: (indicator: CatalogEntry) => void;
  removeFavoriteIndicator: (indicatorId: string) => void;
  addFavoriteEntity: (entityId: string) => void;
  removeFavoriteEntity: (entityId: string) => void;
  isFavoriteIndicator: (indicatorId: string) => boolean;
  isFavoriteEntity: (entityId: string) => boolean;
}

const MAX_RECENT_CHARTS = 20;

/**
 * Generate a unique ID for history items
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const useHistoryStore = create<HistoryState & HistoryActions>()(
  persist(
    (set, get) => ({
      recentCharts: [],
      favoriteIndicators: [],
      favoriteEntities: [],

      addRecentChart: (query, title) =>
        set((state) => {
          const newItem: HistoryItem = {
            id: generateId(),
            query,
            title,
            timestamp: Date.now(),
          };

          // Remove duplicates (same indicator + entities)
          const filtered = state.recentCharts.filter(
            (item) =>
              !(
                item.query.y[0]?.indicatorId === query.y[0]?.indicatorId &&
                JSON.stringify(item.query.entities) ===
                  JSON.stringify(query.entities)
              )
          );

          return {
            recentCharts: [newItem, ...filtered].slice(0, MAX_RECENT_CHARTS),
          };
        }),

      removeRecentChart: (id) =>
        set((state) => ({
          recentCharts: state.recentCharts.filter((item) => item.id !== id),
        })),

      clearHistory: () => set({ recentCharts: [] }),

      addFavoriteIndicator: (indicator) =>
        set((state) => {
          if (
            state.favoriteIndicators.some(
              (i) => i.indicatorId === indicator.indicatorId
            )
          ) {
            return state;
          }
          return {
            favoriteIndicators: [...state.favoriteIndicators, indicator],
          };
        }),

      removeFavoriteIndicator: (indicatorId) =>
        set((state) => ({
          favoriteIndicators: state.favoriteIndicators.filter(
            (i) => i.indicatorId !== indicatorId
          ),
        })),

      addFavoriteEntity: (entityId) =>
        set((state) => {
          if (state.favoriteEntities.includes(entityId)) {
            return state;
          }
          return {
            favoriteEntities: [...state.favoriteEntities, entityId],
          };
        }),

      removeFavoriteEntity: (entityId) =>
        set((state) => ({
          favoriteEntities: state.favoriteEntities.filter(
            (id) => id !== entityId
          ),
        })),

      isFavoriteIndicator: (indicatorId) =>
        get().favoriteIndicators.some((i) => i.indicatorId === indicatorId),

      isFavoriteEntity: (entityId) =>
        get().favoriteEntities.includes(entityId),
    }),
    {
      name: 'quick-data-viz-history',
      version: 1,
    }
  )
);

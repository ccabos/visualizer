/**
 * Cache service with in-memory and IndexedDB storage
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: CacheEntry<unknown>;
  };
}

const DB_NAME = 'quick-data-viz-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private db: IDBPDatabase<CacheDB> | null = null;
  private dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async getDB(): Promise<IDBPDatabase<CacheDB>> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });

    this.db = await this.dbPromise;
    return this.db;
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Get a value from cache (memory first, then IndexedDB)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (this.isExpired(memEntry)) {
        this.memoryCache.delete(key);
      } else {
        return memEntry.data;
      }
    }

    // Check IndexedDB
    try {
      const db = await this.getDB();
      const dbEntry = await db.get(STORE_NAME, key) as CacheEntry<T> | undefined;

      if (dbEntry) {
        if (this.isExpired(dbEntry)) {
          await db.delete(STORE_NAME, key);
        } else {
          // Promote to memory cache
          this.memoryCache.set(key, dbEntry);
          return dbEntry.data;
        }
      }
    } catch (error) {
      console.warn('IndexedDB cache read failed:', error);
    }

    return null;
  }

  /**
   * Set a value in cache (both memory and IndexedDB)
   */
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Always set in memory
    this.memoryCache.set(key, entry);

    // Try to persist to IndexedDB
    try {
      const db = await this.getDB();
      await db.put(STORE_NAME, entry, key);
    } catch (error) {
      console.warn('IndexedDB cache write failed:', error);
    }
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    try {
      const db = await this.getDB();
      await db.delete(STORE_NAME, key);
    } catch (error) {
      console.warn('IndexedDB cache delete failed:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      const db = await this.getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.warn('IndexedDB cache clear failed:', error);
    }
  }

  /**
   * Get cache key for a URL
   */
  getCacheKey(sourceId: string, url: string): string {
    return `${sourceId}:${url}`;
  }

  /**
   * Clean up expired entries from IndexedDB
   */
  async cleanupExpired(): Promise<number> {
    let deletedCount = 0;

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      let cursor = await store.openCursor();

      while (cursor) {
        if (this.isExpired(cursor.value)) {
          await cursor.delete();
          deletedCount++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
    } catch (error) {
      console.warn('IndexedDB cleanup failed:', error);
    }

    // Also clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

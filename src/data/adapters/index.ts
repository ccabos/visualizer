/**
 * Data adapter exports and factory
 */

import { BaseAdapter } from './BaseAdapter';
import { WorldBankAdapter } from './WorldBankAdapter';
import { EurostatAdapter } from './EurostatAdapter';
import { OWIDAdapter } from './OWIDAdapter';

export { BaseAdapter } from './BaseAdapter';
export { WorldBankAdapter } from './WorldBankAdapter';
export { EurostatAdapter } from './EurostatAdapter';
export { OWIDAdapter } from './OWIDAdapter';

// Lazy-initialized adapter instances
let adapters: Record<string, BaseAdapter> | null = null;

/**
 * Get all available adapters
 */
function getAdapters(): Record<string, BaseAdapter> {
  if (!adapters) {
    adapters = {
      worldbank: new WorldBankAdapter(),
      eurostat: new EurostatAdapter(),
      owid: new OWIDAdapter(),
    };
  }
  return adapters;
}

/**
 * Get an adapter by source ID
 */
export function getAdapter(sourceId: string): BaseAdapter {
  const allAdapters = getAdapters();
  const adapter = allAdapters[sourceId];

  if (!adapter) {
    throw new Error(`Unknown data source: ${sourceId}. Available: ${Object.keys(allAdapters).join(', ')}`);
  }

  return adapter;
}

/**
 * Get list of available source IDs
 */
export function getAvailableSources(): string[] {
  return Object.keys(getAdapters());
}

/**
 * Get adapter configurations for all sources
 */
export function getAllSourceConfigs() {
  const allAdapters = getAdapters();
  return Object.values(allAdapters).map((adapter) => adapter.getConfig());
}

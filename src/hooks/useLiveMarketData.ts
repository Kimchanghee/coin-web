import { useSyncExternalStore } from 'react';
import { subscribeToLiveMarketCollector, startLiveMarketCollector } from '../components/services/liveMarketCollector';
import type { ExtendedPriceUpdate } from '../types';

type ExtendedFields = {
  change24h?: number;
  volume24h?: number;
  changePrice?: number;
};

type LiveMarketSnapshot = {
  prices: Record<string, number>;
  extended: Record<string, ExtendedFields>;
  priceTimestamps: Record<string, number>;
  extendedTimestamps: Record<string, number>;
  priceSampleCounts: Record<string, number>;
  extendedSampleCounts: Record<string, number>;
};

const createEmptySnapshot = (): LiveMarketSnapshot => ({
  prices: {},
  extended: {},
  priceTimestamps: {},
  extendedTimestamps: {},
  priceSampleCounts: {},
  extendedSampleCounts: {},
});

type Listener = () => void;

class LiveMarketStore {
  private state: LiveMarketSnapshot = createEmptySnapshot();
  private listeners = new Set<Listener>();
  private unsubscribeCollector: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.ensureCollectorSubscription();
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);

    // Guarantee the collector stays active even if no React components are
    // currently consuming the store.
    this.ensureCollectorSubscription();

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LiveMarketSnapshot => {
    return {
      prices: { ...this.state.prices },
      extended: Object.fromEntries(
        Object.entries(this.state.extended).map(([key, value]) => [key, { ...value }])
      ),
      priceTimestamps: { ...this.state.priceTimestamps },
      extendedTimestamps: { ...this.state.extendedTimestamps },
      priceSampleCounts: { ...this.state.priceSampleCounts },
      extendedSampleCounts: { ...this.state.extendedSampleCounts },
    };
  };

  private ensureCollectorSubscription = () => {
    if (typeof window === 'undefined' || this.unsubscribeCollector) {
      return;
    }

    startLiveMarketCollector();
    this.unsubscribeCollector = subscribeToLiveMarketCollector(this.handleUpdate);
  };

  ensureWarm = () => {
    this.ensureCollectorSubscription();
  };

  private handleUpdate = (update: ExtendedPriceUpdate) => {
    const now = Date.now();

    let priceChanged = false;
    let extendedChanged = false;

    if (typeof update.price === 'number' && Number.isFinite(update.price) && update.price > 0) {
      const prevPrice = this.state.prices[update.priceKey];
      if (prevPrice !== update.price) {
        this.state.prices[update.priceKey] = update.price;
        priceChanged = true;
      }

      if (this.state.priceTimestamps[update.priceKey] !== now) {
        this.state.priceTimestamps[update.priceKey] = now;
        priceChanged = true;
      }

      const nextSample = (this.state.priceSampleCounts[update.priceKey] ?? 0) + 1;
      if (this.state.priceSampleCounts[update.priceKey] !== nextSample) {
        this.state.priceSampleCounts[update.priceKey] = nextSample;
        priceChanged = true;
      }
    }

    const nextExtended: ExtendedFields = {};

    if (typeof update.change24h === 'number' && Number.isFinite(update.change24h)) {
      nextExtended.change24h = update.change24h;
    }
    if (typeof update.volume24h === 'number' && Number.isFinite(update.volume24h)) {
      nextExtended.volume24h = update.volume24h;
    }
    if (typeof update.changePrice === 'number' && Number.isFinite(update.changePrice)) {
      nextExtended.changePrice = update.changePrice;
    }

    if (Object.keys(nextExtended).length > 0) {
      const existing = this.state.extended[update.priceKey] ?? {};
      const merged: ExtendedFields = {
        ...existing,
        ...nextExtended,
      };

      if (
        existing.change24h !== merged.change24h ||
        existing.volume24h !== merged.volume24h ||
        existing.changePrice !== merged.changePrice
      ) {
        this.state.extended[update.priceKey] = merged;
        extendedChanged = true;
      }

      if (this.state.extendedTimestamps[update.priceKey] !== now) {
        this.state.extendedTimestamps[update.priceKey] = now;
        extendedChanged = true;
      }

      const nextExtendedSample = (this.state.extendedSampleCounts[update.priceKey] ?? 0) + 1;
      if (this.state.extendedSampleCounts[update.priceKey] !== nextExtendedSample) {
        this.state.extendedSampleCounts[update.priceKey] = nextExtendedSample;
        extendedChanged = true;
      }
    }

    if (priceChanged || extendedChanged) {
      this.notify();
    }
  };

  private notify = () => {
    this.listeners.forEach(listener => listener());
  };
}

const globalKey = '__coin_live_market_store__';

const getStore = (): LiveMarketStore => {
  if (typeof window === 'undefined') {
    return new LiveMarketStore();
  }

  const anyWindow = window as typeof window & { [globalKey]?: LiveMarketStore };
  if (!anyWindow[globalKey]) {
    anyWindow[globalKey] = new LiveMarketStore();
  }

  return anyWindow[globalKey];
};

const store = getStore();

/**
 * Eagerly bootstraps the live market store so it begins buffering updates even
 * before any React component subscribes to it. This keeps the internal cache
 * warm while the UI is dormant.
 */
export const bootstrapLiveMarketStore = (): void => {
  store.ensureWarm();
  // Access the snapshot to guarantee the singleton instance is retained so the
  // collector subscription attached during bootstrap is not garbage-collected.
  void store.getSnapshot();
};

const noopSnapshot: LiveMarketSnapshot = createEmptySnapshot();

export const useLiveMarketData = (): LiveMarketSnapshot => {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => noopSnapshot
  );
};

export type { LiveMarketSnapshot };

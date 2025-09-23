import type { ExtendedPriceUpdate } from '../../types';
import { allServices } from './exchanges';

export type LiveMarketCollectorListener = (update: ExtendedPriceUpdate) => void;

class LiveMarketCollector {
  private listeners = new Set<LiveMarketCollectorListener>();
  private started = false;

  start() {
    if (this.started) {
      return;
    }

    this.started = true;

    const dispatch = (update: ExtendedPriceUpdate) => {
      this.listeners.forEach(listener => {
        try {
          listener(update);
        } catch (error) {
          console.error('[LiveMarketCollector] Listener failure:', error);
        }
      });
    };

    const handlePriceOnlyUpdate = (update: { priceKey: string; price: number }) => {
      dispatch(update);
    };

    allServices.forEach(service => {
      try {
        if (typeof service.connectExtended === 'function') {
          service.connectExtended(dispatch);
        } else {
          service.connect(handlePriceOnlyUpdate);
        }
      } catch (error) {
        console.error(`[LiveMarketCollector] Failed to connect ${service.id}:`, error);
      }
    });
  }

  subscribe(listener: LiveMarketCollectorListener) {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const collector = new LiveMarketCollector();

export const startLiveMarketCollector = () => {
  collector.start();
};

export const subscribeToLiveMarketCollector = (listener: LiveMarketCollectorListener) => {
  return collector.subscribe(listener);
};

// Ensure the collector boots up immediately when the module loads so that
// exchange connections remain active even before any consumer subscribes.
startLiveMarketCollector();

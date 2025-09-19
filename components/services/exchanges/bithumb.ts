// components/services/exchanges/bithumb.ts - 확장 데이터 개선

import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { buildProxyUrl, safeParseNumber, safeMultiply } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const POLLING_INTERVAL_MS = 5000;

const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;

  const fetchPrices = async (callback: ExtendedPriceUpdateCallback) => {
    if (!isActive) return;

    try {
      const response = await fetch(buildProxyUrl('/api/proxy/bithumb'), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const entries = data?.data;

      if (!entries || data?.status !== '0000') {
        throw new Error('Invalid response structure');
      }

      Object.entries(entries).forEach(([symbolKey, priceData]: [string, any]) => {
        if (!priceData || symbolKey === 'date') {
          return;
        }

        const price = safeParseNumber(priceData.closing_price);
        if (price === undefined || price <= 0) {
          return;
        }

        const change24h = safeParseNumber(priceData['24H_fluctate_rate']);
        const volume24h = safeParseNumber(priceData.acc_trade_value_24H);

        const symbol = symbolKey.toUpperCase();

        callback({
          priceKey: `${id}-${symbol}`,
          price,
          ...(change24h !== undefined ? { change24h } : {}),
          ...(volume24h !== undefined ? { volume24h } : {}),
        });
      });
    } catch (error) {
      console.error(`[${id}] Failed to fetch data:`, error);
    }
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    isActive = true;
    console.log(`🏢 [${id}] Starting extended connection...`);

    fetchPrices(callback);
    intervalId = setInterval(() => fetchPrices(callback), POLLING_INTERVAL_MS);
  };
  
  // 기본 connect (하위 호환성)
  const connect = (callback: PriceUpdateCallback) => {
    connectExtended((update) => {
      callback({
        priceKey: update.priceKey,
        price: update.price
      });
    });
  };

  const disconnect = () => {
    console.log(`🛑 [${id}] Disconnecting service...`);
    isActive = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const bithumbService = createBithumbService();

// =============================================================================

// components/services/exchanges/coinone.ts - 확장 데이터 개선

const createCoinoneService = (): ExchangeService => {
  const id = 'coinone_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;

  const fetchPrices = async (callback: ExtendedPriceUpdateCallback) => {
    if (!isActive) return;

    try {
      const response = await fetch(buildProxyUrl('/api/proxy/coinone'), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const tickers = data?.tickers;

      if (!tickers || data?.result !== 'success') {
        throw new Error('Invalid response structure');
      }

      Object.entries(tickers).forEach(([symbolKey, ticker]: [string, any]) => {
        if (!ticker) {
          return;
        }

        const symbol = symbolKey.toUpperCase();
        const lastPrice = safeParseNumber(ticker.last ?? ticker.closing_price ?? ticker.price);
        if (lastPrice === undefined || lastPrice <= 0) {
          return;
        }

        const previousPrice = safeParseNumber(
          ticker.yesterday_last ?? ticker.prev_closing_price ?? ticker.yesterday_price ?? ticker.first
        );

        const quoteVolume =
          safeParseNumber(ticker.volume_krw ?? ticker.acc_trade_value_24h ?? ticker.volumeValue) ??
          safeMultiply(ticker.volume ?? ticker.volume24h, lastPrice);

        let change24h: number | undefined;
        if (previousPrice !== undefined && previousPrice > 0) {
          change24h = ((lastPrice - previousPrice) / previousPrice) * 100;
        }

        callback({
          priceKey: `${id}-${symbol}`,
          price: lastPrice,
          ...(change24h !== undefined && Number.isFinite(change24h) ? { change24h } : {}),
          ...(quoteVolume !== undefined && quoteVolume > 0 ? { volume24h: quoteVolume } : {}),
        });
      });
    } catch (error) {
      console.error(`[${id}] Failed to fetch data:`, error);
    }
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    isActive = true;
    console.log(`🏢 [${id}] Starting extended connection...`);

    fetchPrices(callback);
    intervalId = setInterval(() => fetchPrices(callback), POLLING_INTERVAL_MS);
  };
  
  const connect = (callback: PriceUpdateCallback) => {
    connectExtended((update) => {
      callback({
        priceKey: update.priceKey,
        price: update.price
      });
    });
  };

  const disconnect = () => {
    console.log(`🛑 [${id}] Disconnecting service...`);
    isActive = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const coinoneService = createCoinoneService();
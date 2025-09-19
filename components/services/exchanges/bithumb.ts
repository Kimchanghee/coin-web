// components/services/exchanges/bithumb.ts - 확장 데이터 개선

import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { buildProxyUrl, safeParseNumber } from './utils';

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
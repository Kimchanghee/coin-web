// components/services/exchanges/coinone.ts
import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { buildProxyUrl, safeParseNumber, safeMultiply } from './utils';

// ExtendedPriceUpdate 타입을 사용
type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const POLLING_INTERVAL_MS = 5000;

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

export const coinoneService = createCoinoneService();

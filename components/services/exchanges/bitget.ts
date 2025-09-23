import type { ExchangeService, PriceUpdateCallback } from '../../../types';
import { COIN_METADATA } from '../../../constants';

const createBitgetService = (): ExchangeService => {
  const id = 'bitget_usdt';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  const prices: { [key: string]: number } = {};
  const symbols = COIN_METADATA.map(coin => coin.symbol);

  symbols.forEach(symbol => {
    prices[symbol] = 1;
  });

  const connect = (callback: PriceUpdateCallback) => {
    intervalId = setInterval(() => {
      symbols.forEach(symbol => {
        const priceChangePercent = (Math.random() - 0.5) * 0.005;
        prices[symbol] *= 1 + priceChangePercent;

        callback({
          priceKey: `${id}-${symbol}`,
          price: prices[symbol],
        });
      });
    }, 2100 + Math.random() * 1000);
  };

  const disconnect = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { id, connect, disconnect };
};

export const bitgetService = createBitgetService();
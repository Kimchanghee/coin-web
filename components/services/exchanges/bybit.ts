import type { ExchangeService, PriceUpdateCallback } from '../../../types';
import { MOCK_COIN_DATA } from '../../../constants';

const createBybitService = (): ExchangeService => {
  const id = 'bybit_usdt';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  const prices: { [key: string]: number } = {};

  MOCK_COIN_DATA.forEach(coin => {
    prices[coin.symbol] = coin.overseasPrice * 0.999;
  });

  const connect = (callback: PriceUpdateCallback) => {
    intervalId = setInterval(() => {
      MOCK_COIN_DATA.forEach(coin => {
        const priceChangePercent = (Math.random() - 0.5) * 0.005;
        prices[coin.symbol] *= (1 + priceChangePercent);
        
        callback({
          priceKey: `${id}-${coin.symbol}`,
          price: prices[coin.symbol],
        });
      });
    }, 1900 + Math.random() * 1000);
  };

  const disconnect = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { id, connect, disconnect };
};

export const bybitService = createBybitService();
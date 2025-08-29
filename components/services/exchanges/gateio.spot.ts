import type { ExchangeService, PriceUpdateCallback } from '../../../types';
import { MOCK_COIN_DATA } from '../../../constants';

const createGateioSpotService = (): ExchangeService => {
  const id = 'gateio_usdt_spot';
  let intervalId: number | undefined;
  const prices: { [key:string]: number } = {};

  MOCK_COIN_DATA.forEach(coin => {
    prices[coin.symbol] = coin.overseasPrice * 0.9995;
  });

  const connect = (callback: PriceUpdateCallback) => {
    intervalId = setInterval(() => {
      MOCK_COIN_DATA.forEach(coin => {
        const volatility = coin.symbol === 'BTC' ? 0.004 : coin.symbol === 'ETH' ? 0.006 : 0.009;
        const isJump = Math.random() < 0.01;
        const jumpMultiplier = isJump ? (Math.random() > 0.5 ? 1.02 : 0.98) : 1;
        const priceChangePercent = (Math.random() - 0.5) * volatility;
        prices[coin.symbol] *= (1 + priceChangePercent) * jumpMultiplier;

        if (prices[coin.symbol] < 0) {
            prices[coin.symbol] = 0.0001;
        }
        
        callback({
          priceKey: `${id}-${coin.symbol}`,
          price: prices[coin.symbol],
        });
      });
    }, 2600 + Math.random() * 1000);
  };

  const disconnect = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { id, connect, disconnect };
};

export const gateioSpotService = createGateioSpotService();
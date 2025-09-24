import type {
  ExchangeService,
  ExtendedPriceUpdateCallback,
  PriceUpdateCallback,
} from '../../../types';
import { deriveChangePercent, deriveQuoteVolume, safeParseNumber } from './utils';

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
  'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'UNIUSDT',
  'ATOMUSDT', 'XLMUSDT', 'ALGOUSDT', 'NEARUSDT', 'FILUSDT'
];

const createBybitSpotService = (): ExchangeService => {
  const id = 'bybit_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const cleanupConnection = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }

    if (ws) {
      try {
        ws.close();
      } catch (error) {
        console.error(`[${id}] Error closing WebSocket:`, error);
      }
      ws = null;
    }
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Bybit Spot WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);

          const subscribeMsg = {
            op: 'subscribe',
            args: SYMBOLS.map(symbol => `tickers.${symbol}`)
          };

          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`[${id}] Subscription sent`);

          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.ret_msg === 'pong') {
              return;
            }

            if (message.topic && message.topic.startsWith('tickers.')) {
              const payload = Array.isArray(message.data) ? message.data[0] : message.data;
              if (!payload) return;

              const rawSymbol = typeof payload.symbol === 'string' ? payload.symbol : undefined;
              const price = safeParseNumber(payload.lastPrice);

              if (!rawSymbol || price === undefined || price <= 0) {
                return;
              }

              const symbol = rawSymbol.replace('USDT', '');
              const change24h = deriveChangePercent({
                ratio: payload.price24hPcnt,
                percent: payload.price24hPcnt,
                priceChange: payload.change24h ?? payload.price24hPcntValue,
                openPrice: payload.prevPrice24h ?? payload.prevPrice1h ?? payload.prevPrice,
                lastPrice: price,
              });

              const volume24h = deriveQuoteVolume(
                payload.turnover24h,
                payload.volume24h,
                price
              );

              callback({
                priceKey: `${id}-${symbol}`,
                price,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
              });

              if ((symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') && Math.random() < 0.05) {
                const changeText = change24h !== undefined ? change24h.toFixed(2) : 'n/a';
                const volumeText = volume24h !== undefined ? volume24h.toFixed(0) : 'N/A';
                console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeText}%) Vol: ${volumeText}`);
              }
            }
          } catch (error) {
            console.error(`[${id}] Error parsing message:`, error);
          }
        };

        ws.onerror = (error) => {
          console.error(`[${id}] WebSocket error:`, error);
        };

        ws.onclose = (event) => {
          console.log(`[${id}] WebSocket disconnected. Code: ${event.code}`);

          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = undefined;
          }

          ws = null;

          reconnectTimeout = setTimeout(() => {
            console.log(`[${id}] Attempting to reconnect...`);
            connectWebSocket();
          }, 5000);
        };
      } catch (error) {
        console.error(`[${id}] Failed to connect:`, error);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
  };

  const connect = (callback: PriceUpdateCallback) => {
    connectExtended(update => {
      callback({ priceKey: update.priceKey, price: update.price });
    });
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting service...`);
    cleanupConnection();
  };

  return { id, connect, connectExtended, disconnect };
};

export const bybitSpotService = createBybitSpotService();

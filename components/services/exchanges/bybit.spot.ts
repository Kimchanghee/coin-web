// components/services/exchanges/bybit.spot.ts
import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

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

              const symbol = typeof payload.symbol === 'string'
                ? payload.symbol.replace('USDT', '')
                : undefined;
              const price = payload.lastPrice ? parseFloat(payload.lastPrice) : undefined;

              if (!symbol || !price || !Number.isFinite(price)) {
                return;
              }

              const change24hRaw = payload.price24hPcnt ? parseFloat(payload.price24hPcnt) * 100 : undefined;
              const turnover24h = payload.turnover24h ? parseFloat(payload.turnover24h) : undefined;
              const volume24hBase = payload.volume24h ? parseFloat(payload.volume24h) : undefined;

              let volume24h: number | undefined = undefined;
              if (Number.isFinite(turnover24h)) {
                volume24h = turnover24h as number;
              } else if (Number.isFinite(volume24hBase)) {
                volume24h = (volume24hBase as number) * price;
              }

              const change24h = Number.isFinite(change24hRaw) ? (change24hRaw as number) : undefined;
              const normalizedVolume = Number.isFinite(volume24h) ? (volume24h as number) : undefined;

              callback({
                priceKey: `${id}-${symbol}`,
                price,
                change24h,
                volume24h: normalizedVolume
              });

              if ((symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') && Math.random() < 0.05) {
                const changeText = change24h !== undefined ? change24h.toFixed(2) : '0.00';
                const volumeText = normalizedVolume !== undefined ? normalizedVolume.toFixed(0) : 'N/A';
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

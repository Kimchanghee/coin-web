import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'MATICUSDT',
  'DOTUSDT',
  'AVAXUSDT',
  'SHIBUSDT',
  'TRXUSDT',
  'LTCUSDT',
  'BCHUSDT',
  'LINKUSDT',
  'UNIUSDT',
  'ATOMUSDT',
  'XLMUSDT',
  'ALGOUSDT',
  'NEARUSDT',
  'FILUSDT'
];

const STREAM_URL = `wss://stream.binance.com:9443/stream?streams=${SYMBOLS.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/')}`;

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const createBinanceSpotService = (): ExchangeService => {
  const id = 'binance_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let manualClose = false;
  let currentCallback: ExtendedPriceUpdateCallback | null = null;

  const scheduleReconnect = () => {
    if (!currentCallback) {
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = undefined;
      connectWebSocket();
    }, 5000);
  };

  const cleanupConnection = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }

    if (ws) {
      try {
        ws.close(1000, 'Binance spot service shutdown');
      } catch (error) {
        console.error(`[${id}] Error while closing WebSocket:`, error);
      }
      ws = null;
    }
  };

  const connectWebSocket = () => {
    manualClose = false;

    try {
      console.log(`🏢 [${id}] Connecting to Binance Spot WebSocket...`);
      ws = new WebSocket(STREAM_URL);

      ws.onopen = () => {
        console.log(`✅ [${id}] WebSocket connected successfully!`);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const payload = message?.data;

          if (!payload) {
            return;
          }

          const rawSymbol = typeof payload.s === 'string' ? payload.s : undefined;
          const symbol = rawSymbol?.endsWith('USDT') ? rawSymbol.replace('USDT', '') : undefined;
          const price = parseNumber(payload.c);

          if (!symbol || price === undefined || price <= 0) {
            return;
          }

          const change24h = parseNumber(payload.P);
          const quoteVolume = parseNumber(payload.q);
          const baseVolume = parseNumber(payload.v);
          const volume24h = quoteVolume ?? (baseVolume !== undefined ? baseVolume * price : undefined);

          const update: ExtendedPriceUpdate = {
            priceKey: `${id}-${symbol}`,
            price
          };

          if (change24h !== undefined) {
            update.change24h = change24h;
          }

          if (volume24h !== undefined && Number.isFinite(volume24h)) {
            update.volume24h = volume24h;
          }

          currentCallback?.(update);

          if ((symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') && Math.random() < 0.05) {
            const changeLabel = update.change24h !== undefined ? update.change24h.toFixed(2) : 'n/a';
            const volumeLabel = update.volume24h !== undefined ? update.volume24h.toFixed(0) : 'n/a';
            console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeLabel}%) Vol: ${volumeLabel}`);
          }
        } catch (error) {
          console.error(`❌ [${id}] Error parsing message:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ [${id}] WebSocket error:`, error);
      };

      ws.onclose = (event) => {
        console.log(`🔌 [${id}] WebSocket disconnected. Code: ${event.code}`);
        ws = null;

        if (manualClose) {
          manualClose = false;
          return;
        }

        scheduleReconnect();
      };
    } catch (error) {
      console.error(`❌ [${id}] Failed to connect:`, error);
      scheduleReconnect();
    }
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    currentCallback = callback;
    connectWebSocket();

    return () => {
      manualClose = true;
      currentCallback = null;
      cleanupConnection();
    };
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
    manualClose = true;
    currentCallback = null;
    cleanupConnection();
  };

  return { id, connect, connectExtended, disconnect };
};

export const binanceSpotService = createBinanceSpotService();


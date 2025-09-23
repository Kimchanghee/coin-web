import type {
  ExchangeService,
  ExtendedPriceUpdate,
  ExtendedPriceUpdateCallback,
  PriceUpdateCallback,
} from '../../../types';
import { buildProxyUrl, deriveChangePercent, deriveQuoteVolume, safeParseNumber } from './utils';

const WS_ENDPOINT = 'wss://api.upbit.com/websocket/v1';
const SUBSCRIBE_CODES = [
  'KRW-BTC', 'KRW-ETH', 'KRW-SOL', 'KRW-XRP', 'KRW-ADA',
  'KRW-DOGE', 'KRW-MATIC', 'KRW-DOT', 'KRW-AVAX', 'KRW-SHIB',
  'KRW-TRX', 'KRW-LTC', 'KRW-BCH', 'KRW-LINK', 'KRW-UNI',
  'KRW-ATOM', 'KRW-XLM', 'KRW-ALGO', 'KRW-NEAR', 'KRW-FIL',
  'KRW-SAND', 'KRW-MANA', 'KRW-AAVE', 'KRW-GRT', 'KRW-FTM',
  'KRW-VET', 'KRW-ICP', 'KRW-HBAR', 'KRW-XTZ', 'KRW-EOS',
  'KRW-MKR', 'KRW-ENJ', 'KRW-BAT', 'KRW-ZEC', 'KRW-KAVA',
] as const;

const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  let eventSource: EventSource | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const extendedData: Map<string, ExtendedPriceUpdate> = new Map();

  const emitUpdate = (
    callback: ExtendedPriceUpdateCallback,
    update: ExtendedPriceUpdate
  ) => {
    extendedData.set(update.priceKey, update);
    callback(update);
  };

  const connectDirect = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Upbit WebSocket...`);
        ws = new WebSocket(WS_ENDPOINT);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);

          const subscribeMessage = [
            { ticket: `coin-web-${Date.now()}` },
            { type: 'ticker', codes: [...SUBSCRIBE_CODES], isOnlyRealtime: true },
            { format: 'DEFAULT' },
          ];

          ws?.send(JSON.stringify(subscribeMessage));
          console.log(`[${id}] Subscription sent`);

          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('PING');
            }
          }, 60000);
        };

        ws.onmessage = async (event) => {
          try {
            let data: any;

            if (event.data instanceof ArrayBuffer) {
              const text = new TextDecoder('utf-8').decode(event.data);
              data = JSON.parse(text);
            } else if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }

            if (data?.type !== 'ticker' || typeof data.code !== 'string') {
              return;
            }

            const symbol = data.code.replace('KRW-', '');
            const price = safeParseNumber(data.trade_price);
            if (!symbol || price === undefined || price <= 0) {
              return;
            }

            const change24h = deriveChangePercent({
              ratio: data.signed_change_rate,
              percent: data.signed_change_rate,
              priceChange: data.signed_change_price,
              openPrice: data.prev_closing_price,
              lastPrice: price,
            });

            const volume24h = deriveQuoteVolume(
              data.acc_trade_price_24h,
              data.acc_trade_volume_24h,
              price
            );

            const changePrice = safeParseNumber(data.signed_change_price);
            const priceKey = `${id}-${symbol}`;

            emitUpdate(callback, {
              priceKey,
              price,
              ...(change24h !== undefined ? { change24h } : {}),
              ...(volume24h !== undefined ? { volume24h } : {}),
              ...(changePrice !== undefined ? { changePrice } : {}),
            });
          } catch (error) {
            console.error(`[${id}] Error parsing message:`, error);
          }
        };

        ws.onerror = (error) => {
          console.error(`[${id}] WebSocket error:`, error);
        };

        ws.onclose = (event) => {
          console.log(`[${id}] WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);

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

  const normalizeBackendPayload = (payload: any): ExtendedPriceUpdate | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const rawPriceKey = typeof payload.priceKey === 'string' ? payload.priceKey : undefined;
    const rawSymbol = typeof payload.symbol === 'string' ? payload.symbol : undefined;
    const priceKey = rawPriceKey ?? (rawSymbol ? `${id}-${rawSymbol}` : undefined);
    const price = safeParseNumber(payload.price ?? payload.trade_price);

    if (!priceKey || price === undefined || price <= 0) {
      return null;
    }

    const change24h = safeParseNumber(payload.change24h ?? payload.signed_change_rate);
    const volume24h = safeParseNumber(payload.volume24h ?? payload.acc_trade_price_24h);
    const changePrice = safeParseNumber(payload.changePrice ?? payload.signed_change_price);

    return {
      priceKey,
      price,
      ...(change24h !== undefined ? { change24h } : {}),
      ...(volume24h !== undefined ? { volume24h } : {}),
      ...(changePrice !== undefined ? { changePrice } : {}),
    };
  };

  const tryConnectBackend = (callback: ExtendedPriceUpdateCallback): boolean => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return false;
    }

    const endpoint = buildProxyUrl('/api/market/upbit/stream');
    const source = new EventSource(endpoint);
    eventSource = source;

    let firstMessageReceived = false;
    let closed = false;

    const fallbackToDirect = () => {
      if (closed) {
        return;
      }
      closed = true;
      try {
        source.close();
      } catch (error) {
        console.error(`[${id}] Failed to close backend stream:`, error);
      }
      eventSource = null;
      connectDirect(callback);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (!firstMessageReceived) {
        console.warn(`[${id}] Backend stream timeout, falling back to direct WebSocket`);
        fallbackToDirect();
      }
    }, 5000);

    const handleUpdate = (raw: any) => {
      const update = normalizeBackendPayload(raw);
      if (update) {
        if (!firstMessageReceived) {
          firstMessageReceived = true;
          window.clearTimeout(fallbackTimer);
        }
        emitUpdate(callback, update);
      }
    };

    source.addEventListener('snapshot', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && typeof payload.tickers === 'object') {
          Object.values(payload.tickers).forEach(handleUpdate);
        }
      } catch (error) {
        console.error(`[${id}] Failed to parse backend snapshot:`, error);
      }
    });

    source.addEventListener('ticker', (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleUpdate(payload);
      } catch (error) {
        console.error(`[${id}] Failed to parse backend ticker:`, error);
      }
    });

    source.addEventListener('status', (event) => {
      try {
        const status = JSON.parse(event.data);
        if (status?.connected === false) {
          console.warn(`[${id}] Backend stream reported disconnect`);
        }
      } catch (error) {
        console.error(`[${id}] Failed to parse backend status:`, error);
      }
    });

    source.onerror = (error) => {
      console.error(`[${id}] Backend SSE error:`, error);
      if (!firstMessageReceived) {
        fallbackToDirect();
      }
    };

    return true;
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    if (tryConnectBackend(callback)) {
      return;
    }

    connectDirect(callback);
  };

  const connect = (callback: PriceUpdateCallback) => {
    connectExtended((update) => {
      callback({
        priceKey: update.priceKey,
        price: update.price,
      });
    });
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting service...`);

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    extendedData.clear();
  };

  const getExtendedData = (symbol: string): ExtendedPriceUpdate | undefined => {
    return extendedData.get(`${id}-${symbol}`);
  };

  return {
    id,
    connect,
    connectExtended,
    disconnect,
    getExtendedData,
  };
};

export const upbitService = createUpbitService();

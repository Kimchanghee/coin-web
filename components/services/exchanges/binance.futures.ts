import type { ExchangeService, ExtendedPriceUpdate, PriceUpdateCallback } from '../../../types';
import { deriveChangePercent, deriveQuoteVolume, safeParseNumber } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBinanceFuturesService = (): ExchangeService => {
  const id = 'binance_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  
  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Binance Futures WebSocket...`);
        
        const symbols = [
          'btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'adausdt',
          'dogeusdt', 'maticusdt', 'dotusdt', 'avaxusdt', 'shibusdt',
          'trxusdt', 'ltcusdt', 'bchusdt', 'linkusdt', 'uniusdt',
          'atomusdt', 'xlmusdt', 'algousdt', 'nearusdt', 'filusdt'
        ];
        
        const streams = symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (!message.stream || !message.data) {
              return;
            }

            const data = message.data;
            const rawSymbol: string | undefined = data?.s;
            if (!rawSymbol) {
              return;
            }

            const symbol = rawSymbol.replace('USDT', '');
            const price = safeParseNumber(data.c);
            if (price === undefined || price <= 0) {
              return;
            }

            const change24h = deriveChangePercent({
              priceChange: data.p,
              openPrice: data.o,
              lastPrice: price,
            });
            const volume24h = deriveQuoteVolume(data.q, data.v, price);

            callback({
              priceKey: `${id}-${symbol}`,
              price,
              ...(change24h !== undefined ? { change24h } : {}),
              ...(volume24h !== undefined ? { volume24h } : {}),
            });

            if (Math.random() < 0.01) {
              const changeLog = change24h !== undefined ? change24h.toFixed(2) : 'n/a';
              const volumeLog = volume24h !== undefined ? (volume24h / 1_000_000).toFixed(2) : 'n/a';
              console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeLog}%) Vol: $${volumeLog}M`);
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
          
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 [${id}] Attempting to reconnect...`);
            connectWebSocket();
          }, 3000);
        };
        
      } catch (error) {
        console.error(`❌ [${id}] Failed to connect:`, error);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();
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
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const binanceFuturesService = createBinanceFuturesService();
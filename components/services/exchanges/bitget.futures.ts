import type { ExchangeService, ExtendedPriceUpdate, PriceUpdateCallback } from '../../../types';
import { safeMultiply, safeParseNumber } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBitgetFuturesService = (): ExchangeService => {
  const id = 'bitget_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Bitget Futures WebSocket...`);
        ws = new WebSocket('wss://ws.bitget.com/mix/v1/stream');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT'
          ];
          
          const subscribeMsg = {
            op: 'subscribe',
            args: symbols.map(symbol => ({
              instType: 'mc',
              channel: 'ticker',
              instId: `${symbol}_UMCBL`
            }))
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (!data.arg || data.arg.channel !== 'ticker' || !data.data) {
              return;
            }

            data.data.forEach((ticker: any) => {
              const instId: string | undefined = ticker?.instId;
              if (!instId) {
                return;
              }

              const symbol = instId.split('_')[0].replace('USDT', '');
              const price = safeParseNumber(ticker.last);
              if (price === undefined || price <= 0) {
                return;
              }

              const changeRatio = safeParseNumber(ticker.chgUTC);
              const change24h = changeRatio !== undefined ? changeRatio * 100 : undefined;

              const quoteVolume = safeParseNumber(ticker.quoteVolume);
              const baseVolume = safeParseNumber(ticker.baseVolume ?? ticker.volume);
              const volume24h = quoteVolume ?? (baseVolume !== undefined ? safeMultiply(baseVolume, price) : undefined);

              callback({
                priceKey: `${id}-${symbol}`,
                price,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
              });

              if (Math.random() < 0.05) {
                const changeLog = change24h !== undefined ? change24h.toFixed(2) : 'n/a';
                const volumeLog = volume24h !== undefined ? (volume24h / 1_000_000).toFixed(2) : 'n/a';
                console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeLog}%) Vol: $${volumeLog}M`);
              }
            });
          } catch (error) {
            console.error(`❌ [${id}] Error parsing message:`, error);
          }
        };

        ws.onerror = (error) => {
          console.error(`❌ [${id}] WebSocket error:`, error);
        };

        ws.onclose = (event) => {
          console.log(`🔌 [${id}] WebSocket disconnected. Code: ${event.code}`);
          
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = undefined;
          }
          
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
    
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const bitgetFuturesService = createBitgetFuturesService();
import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { safeParseNumber } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBybitFuturesService = (): ExchangeService => {
  const id = 'bybit_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Bybit Futures WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
            'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'UNIUSDT'
          ];
          
          const subscribeMsg = {
            op: 'subscribe',
            args: symbols.map(symbol => `tickers.${symbol}`)
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.ret_msg === 'pong') {
              return;
            }
            
            if (data.topic && data.topic.startsWith('tickers.')) {
              if (data.data) {
                const tickerData = data.data;
                const symbol = tickerData.symbol.replace('USDT', '');
                const price = safeParseNumber(tickerData.lastPrice);
                const change24hRatio = safeParseNumber(tickerData.price24hPcnt);
                const change24h = change24hRatio !== undefined ? change24hRatio * 100 : undefined;
                const volume24h = safeParseNumber(tickerData.turnover24h);

                if (price === undefined) {
                  return;
                }

                const update: ExtendedPriceUpdate = {
                  priceKey: `${id}-${symbol}`,
                  price,
                  ...(change24h !== undefined ? { change24h } : {}),
                  ...(volume24h !== undefined ? { volume24h } : {}),
                };

                callback(update);

                if (Math.random() < 0.05) {
                  const changeText = change24h !== undefined ? change24h.toFixed(2) : 'N/A';
                  const volumeText = volume24h !== undefined ? `$${(volume24h / 1000000).toFixed(2)}M` : 'N/A';
                  console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeText}%) Vol: ${volumeText}`);
                }
              }
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

export const bybitFuturesService = createBybitFuturesService();
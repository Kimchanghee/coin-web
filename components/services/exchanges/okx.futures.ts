import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { safeParseNumber } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createOKXFuturesService = (): ExchangeService => {
  const id = 'okx_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to OKX Futures WebSocket...`);
        ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE',
            'MATIC', 'DOT', 'AVAX', 'SHIB', 'TRX', 'LTC',
            'BCH', 'LINK', 'UNI'
          ];
          
          const args = symbols.map(symbol => ({
            channel: 'tickers',
            instId: `${symbol}-USDT-SWAP`
          }));
          
          const subscribeMsg = {
            op: 'subscribe',
            args: args
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (data.arg && data.arg.channel === 'tickers' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('-')[0];
                const price = safeParseNumber(ticker.last);
                const open24h = safeParseNumber(ticker.open24h);
                const volume24h = safeParseNumber(ticker.volCcy24h);

                if (price === undefined) {
                  return;
                }

                let change24h: number | undefined;
                if (open24h !== undefined && open24h !== 0) {
                  change24h = ((price - open24h) / open24h) * 100;
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
              });
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

export const okxFuturesService = createOKXFuturesService();
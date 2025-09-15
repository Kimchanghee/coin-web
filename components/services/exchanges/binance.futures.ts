import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

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
            
            if (message.stream && message.data) {
              const data = message.data;
              const symbol = data.s.replace('USDT', '');
              const price = parseFloat(data.c); // Current price
              const change24h = parseFloat(data.P); // 24hr percent change
              const volume24h = parseFloat(data.q); // 24hr quote volume (USDT)
              
              callback({
                priceKey: `${id}-${symbol}`,
                price: price,
                change24h: change24h,
                volume24h: volume24h
              });
              
              if (Math.random() < 0.01) {
                console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${change24h.toFixed(2)}%) Vol: $${(volume24h/1000000).toFixed(2)}M`);
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
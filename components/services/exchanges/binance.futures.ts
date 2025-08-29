import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBinanceFuturesService = (): ExchangeService => {
  const id = 'binance_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  
  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Binance Futures WebSocket...`);
        
        // Binance Futures WebSocket streams
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
          console.log(`[${id}] WebSocket connected successfully!`);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.stream && message.data) {
              const data = message.data;
              const symbol = data.s.replace('USDT', '');
              const price = parseFloat(data.c); // Current price
              
              callback({
                priceKey: `${id}-${symbol}`,
                price: price
              });
              
              // 디버깅용 로그
              if (Math.random() < 0.01) {
                console.log(`[${id}] ${symbol}: $${price.toFixed(2)}`);
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
          ws = null;
          
          // 3초 후 재연결
          reconnectTimeout = setTimeout(() => {
            console.log(`[${id}] Attempting to reconnect...`);
            connectWebSocket();
          }, 3000);
        };
        
      } catch (error) {
        console.error(`[${id}] Failed to connect:`, error);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    // 연결 시작
    connectWebSocket();
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting service...`);
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, disconnect };
};

export const binanceFuturesService = createBinanceFuturesService();
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBitgetFuturesService = (): ExchangeService => {
  const id = 'bitget_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  let pingInterval: number | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Bitget Futures WebSocket...`);
        ws = new WebSocket('wss://ws.bitget.com/mix/v1/stream');
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
          // Bitget Futures subscription
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
          console.log(`[${id}] Subscription sent`);
          
          // Ping 전송 (30초마다)
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            // pong 응답 처리
            if (event.data === 'pong') {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            // ticker 데이터 처리
            if (data.arg && data.arg.channel === 'ticker' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('_')[0].replace('USDT', '');
                const price = parseFloat(ticker.last);
                
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price
                });
                
                // 디버깅용 로그
                if (Math.random() < 0.01) {
                  console.log(`[${id}] ${symbol}: $${price.toFixed(2)}`);
                }
              });
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
    
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, disconnect };
};

export const bitgetFuturesService = createBitgetFuturesService();
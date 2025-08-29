import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBybitFuturesService = (): ExchangeService => {
  const id = 'bybit_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  let pingInterval: number | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Bybit Futures WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
          // Bybit v5 Linear (USDT Perpetual) subscription
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
          console.log(`[${id}] Subscription sent`);
          
          // Ping 전송 (20초마다)
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // pong 응답 처리
            if (data.ret_msg === 'pong') {
              return;
            }
            
            // ticker 데이터 처리
            if (data.topic && data.topic.startsWith('tickers.')) {
              if (data.data) {
                const tickerData = data.data;
                const symbol = tickerData.symbol.replace('USDT', '');
                const price = parseFloat(tickerData.lastPrice);
                
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price
                });
                
                // 디버깅용 로그
                if (Math.random() < 0.01) {
                  console.log(`[${id}] ${symbol}: $${price.toFixed(2)}`);
                }
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

export const bybitFuturesService = createBybitFuturesService();
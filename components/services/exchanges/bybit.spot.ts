// components/services/exchanges/bybit.spot.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBybitSpotService = (): ExchangeService => {
  const id = 'bybit_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Bybit Spot WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
          // Bybit v5 subscription
          const symbols = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
            'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'UNIUSDT',
            'ATOMUSDT', 'XLMUSDT', 'ALGOUSDT', 'NEARUSDT', 'FILUSDT'
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
                
                // 디버깅용 로그 (주요 코인만)
                if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') {
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
          
          // 5초 후 재연결
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

export const bybitSpotService = createBybitSpotService();
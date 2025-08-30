import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  
  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Upbit WebSocket...`);
        ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'blob';
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
          // Upbit 실시간 ticker 구독
          const subscribeMessage = [
            { ticket: "uniqueTicket" },
            { 
              type: "ticker", 
              codes: [
                "KRW-BTC", "KRW-ETH", "KRW-SOL", "KRW-XRP", "KRW-ADA", 
                "KRW-DOGE", "KRW-MATIC", "KRW-DOT", "KRW-AVAX", "KRW-SHIB",
                "KRW-TRX", "KRW-LTC", "KRW-BCH", "KRW-LINK", "KRW-UNI",
                "KRW-ATOM", "KRW-XLM", "KRW-ALGO", "KRW-NEAR", "KRW-FIL",
                "KRW-SAND", "KRW-MANA", "KRW-AAVE", "KRW-GRT", "KRW-FTM",
                "KRW-VET", "KRW-ICP", "KRW-HBAR", "KRW-XTZ", "KRW-EOS",
                "KRW-MKR", "KRW-ENJ", "KRW-BAT"
              ],
              isOnlyRealtime: true
            }
          ];
          
          ws?.send(JSON.stringify(subscribeMessage));
          console.log(`[${id}] Subscription sent`);
          
          // Ping 전송 (30초마다)
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('PING');
            }
          }, 30000);
        };

        ws.onmessage = async (event) => {
          try {
            let data;
            
            // Upbit은 Blob 형태로 데이터를 보냄
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }
            
            // ticker 데이터 처리
            if (data.type === 'ticker') {
              const symbol = data.code.replace('KRW-', '');
              const price = data.trade_price;
              
              // 가격 업데이트 콜백
              callback({
                priceKey: `${id}-${symbol}`,
                price: price
              });
              
              // 디버깅용 로그 (가끔씩만)
              if (Math.random() < 0.01) {
                console.log(`[${id}] ${symbol}: ₩${price.toLocaleString('ko-KR')}`);
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
          console.log(`[${id}] WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
          
          // Cleanup
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

export const upbitService = createUpbitService();
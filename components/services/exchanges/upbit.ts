// components/services/exchanges/upbit.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  let pingInterval: number | undefined;
  
  // Upbit에서 거래되는 주요 코인들
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'USDT', 'ADA', 'DOGE', 'MATIC', 'DOT', 
                   'AVAX', 'SHIB', 'TRX', 'LTC', 'BCH', 'LINK', 'UNI', 'ATOM', 'XLM', 
                   'ALGO', 'NEAR', 'FIL', 'SAND', 'MANA', 'AAVE', 'GRT', 'FTM'];
  
  const upbitSymbols = symbols.map(s => {
    // USDT는 KRW 마켓에서 거래되지 않으므로 제외
    if (s === 'USDT') return null;
    return `KRW-${s}`;
  }).filter(Boolean);

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Upbit WebSocket...`);
        ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        
        ws.binaryType = 'blob';
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully`);
          
          // Upbit 구독 메시지 형식
          const subscribeMsg = [
            { ticket: 'upbit-ticker' },
            { 
              type: 'ticker', 
              codes: upbitSymbols,
              isOnlyRealtime: true 
            },
            { format: 'DEFAULT' }
          ];
          
          ws?.send(JSON.stringify(subscribeMsg));
          
          // 30초마다 ping 전송
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('PING');
            }
          }, 30000);
        };

        ws.onmessage = async (event) => {
          try {
            let data;
            
            // Upbit은 Blob 형식으로 데이터를 전송
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }
            
            if (data.type === 'ticker') {
              const symbol = data.code.replace('KRW-', '');
              const price = data.trade_price;
              
              // 가격 업데이트 콜백 호출
              callback({
                priceKey: `${id}-${symbol}`,
                price: price
              });
              
              // 24시간 변동률 등 추가 정보도 전달 가능
              // data.signed_change_rate: 변동률
              // data.acc_trade_volume_24h: 24시간 거래량
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
          cleanup();
          
          // 5초 후 재연결 시도
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = undefined;
              connectWebSocket();
            }, 5000);
          }
        };
        
      } catch (error) {
        console.error(`[${id}] Failed to connect:`, error);
        
        // 연결 실패 시 5초 후 재시도
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = undefined;
            connectWebSocket();
          }, 5000);
        }
      }
    };

    const cleanup = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = undefined;
      }
    };

    // WebSocket 연결 시작
    connectWebSocket();
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting...`);
    
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
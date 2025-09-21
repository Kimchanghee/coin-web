// components/services/exchanges/upbit.ts
import type {
  ExchangeService,
  ExtendedPriceUpdate,
  ExtendedPriceUpdateCallback,
  PriceUpdateCallback,
} from '../../../types';
import {
  deriveChangePercent,
  deriveQuoteVolume,
  normalizeSymbol,
  safeParseNumber,
} from './utils';

const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  
  // 거래대금과 전일대비 데이터를 저장
  const extendedData: Map<string, ExtendedPriceUpdate> = new Map();
  
  // 확장된 콜백 지원
  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
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
                "KRW-MKR", "KRW-ENJ", "KRW-BAT", "KRW-ZEC", "KRW-KAVA"
              ],
              isOnlyRealtime: true
            },
            { format: "DEFAULT" }
          ];
          
          ws?.send(JSON.stringify(subscribeMessage));
          console.log(`[${id}] Subscription sent`);
          
          // Ping 전송 (60초마다) - Upbit은 120초 타임아웃
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('PING');
              console.log(`[${id}] Ping sent`);
            }
          }, 60000);
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
              const symbol = normalizeSymbol(data.code);
              const price = safeParseNumber(data.trade_price);
              const volume24h = deriveQuoteVolume(
                data.acc_trade_price_24h,
                data.acc_trade_volume_24h,
                price
              );
              const changePrice = safeParseNumber(data.signed_change_price);

              if (!symbol || price === undefined || price <= 0) {
                return;
              }

              const change24h = deriveChangePercent({
                ratio: data.signed_change_rate,
                percent: data.signed_change_rate,
                priceChange: data.signed_change_price,
                openPrice: data.prev_closing_price,
                lastPrice: price,
              });

              const priceKey = `${id}-${symbol}`;
              extendedData.set(priceKey, {
                priceKey,
                price,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
                ...(changePrice !== undefined ? { changePrice } : {}),
              });

              callback({
                priceKey,
                price,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
                ...(changePrice !== undefined ? { changePrice } : {}),
              });

              // 디버깅용 상세 로그
              if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') {
                const volumeInBillion = volume24h !== undefined ? (volume24h / 100000000).toFixed(0) : 'n/a';
                console.log(`[${id}] Extended Data Sent:`, {
                  symbol,
                  price,
                  change24h: change24h !== undefined ? `${change24h.toFixed(2)}%` : 'n/a',
                  volume24h,
                  volumeFormatted: `₩${volumeInBillion}억`
                });
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
  
  // 기본 connect (하위 호환성)
  const connect = (callback: PriceUpdateCallback) => {
    // ExtendedPriceUpdate를 PriceUpdate로 변환
    connectExtended((update) => {
      callback({
        priceKey: update.priceKey,
        price: update.price
      });
    });
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
    
    extendedData.clear();
  };

  // 확장 데이터 가져오기 (필요시 사용)
  const getExtendedData = (symbol: string): ExtendedPriceUpdate | undefined => {
    return extendedData.get(`${id}-${symbol}`);
  };

  return { 
    id, 
    connect,
    connectExtended, // 확장 연결 메서드 추가
    disconnect,
    // 확장 기능 (선택적)
    getExtendedData
  };
};

export const upbitService = createUpbitService();

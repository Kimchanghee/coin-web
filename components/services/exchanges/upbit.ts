import type {
  ExchangeService,
  ExtendedPriceUpdate,
  ExtendedPriceUpdateCallback,
  PriceUpdateCallback,
} from '../../../types';
import { deriveChangePercent, deriveQuoteVolume, safeParseNumber } from './utils';

const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  
  const extendedData: Map<string, ExtendedPriceUpdate> = new Map();
  
  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Upbit WebSocket...`);
        ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'arraybuffer';
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
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

            if (event.data instanceof ArrayBuffer) {
              const text = new TextDecoder('utf-8').decode(event.data);
              data = JSON.parse(text);
            } else if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }
            
            if (data.type === 'ticker') {
              const symbol = typeof data.code === 'string' ? data.code.replace('KRW-', '') : undefined;
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
          console.error(`[${id}] WebSocket error:`,ws.onerror = (error) => {
          console.error(`[${id}] WebSocket error:`, error);
        };

        ws.onclose = (event) => {
          console.log(`[${id}] WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
          
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = undefined;
          }
          
          ws = null;
          
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

  const getExtendedData = (symbol: string): ExtendedPriceUpdate | undefined => {
    return extendedData.get(`${id}-${symbol}`);
  };

  return { 
    id, 
    connect,
    connectExtended,
    disconnect,
    getExtendedData
  };
};

export const upbitService = createUpbitService();

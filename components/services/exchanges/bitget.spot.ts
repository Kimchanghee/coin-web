import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { safeParseNumber, safeMultiply } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBitgetSpotService = (): ExchangeService => {
  const id = 'bitget_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Bitget Spot WebSocket...`);
        ws = new WebSocket('wss://ws.bitget.com/spot/v1/stream');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
            'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'UNIUSDT'
          ];
          
          const subscribeMsg = {
            op: 'subscribe',
            args: symbols.map(symbol => ({
              instType: 'sp',
              channel: 'ticker',
              instId: `${symbol}_SPBL`
            }))
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (data.arg && data.arg.channel === 'ticker' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('_')[0].replace('USDT', '');
                const price = safeParseNumber(ticker.last);
                const changeRaw = safeParseNumber(ticker.changeUtc24h ?? ticker.change24h ?? ticker.chgUTC);
                const change24h = changeRaw !== undefined ? changeRaw * 100 : undefined;
                const quoteVolume = safeParseNumber(ticker.usdtVolume ?? ticker.quoteVolume);
                const baseVolume = safeParseNumber(ticker.baseVolume);
                const volume24h = quoteVolume ?? (baseVolume !== undefined && price !== undefined ? safeMultiply(baseVolume, price) : undefined);

                if (price === undefined) {
                  return;
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

export const bitgetSpotService = createBitgetSpotService();
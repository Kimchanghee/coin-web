import type {
  ExchangeService,
  ExtendedPriceUpdateCallback,
  PriceUpdateCallback,
} from '../../../types';
import {
  deriveChangePercent,
  deriveQuoteVolume,
  normalizeSymbol,
  safeParseNumber,
} from './utils';

const createBybitFuturesService = (): ExchangeService => {
  const id = 'bybit_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Bybit Futures WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
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
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.ret_msg === 'pong') {
              return;
            }
            
            if (!data.topic || !data.topic.startsWith('tickers.') || !data.data) {
              return;
            }

            const tickerData = data.data;
            const rawSymbol: string | undefined = tickerData?.symbol;
            const symbol = normalizeSymbol(rawSymbol);
            const price = safeParseNumber(tickerData?.lastPrice);

            if (!symbol || price === undefined || price <= 0) {
              return;
            }
            const change24h = deriveChangePercent({
              ratio: tickerData?.price24hPcnt,
              percent: tickerData?.price24hPcnt,
              priceChange: tickerData?.change24h ?? tickerData?.lastPrice24h,
              openPrice: tickerData?.prevPrice24h ?? tickerData?.prevPrice1h ?? tickerData?.prevPrice,
              lastPrice: price,
            });

            const volume24h = deriveQuoteVolume(
              tickerData?.turnover24h,
              tickerData?.volume24h,
              price
            );

            callback({
              priceKey: `${id}-${symbol}`,
              price,
              ...(change24h !== undefined ? { change24h } : {}),
              ...(volume24h !== undefined ? { volume24h } : {}),
            });

            if (Math.random() < 0.05) {
              const changeLog = change24h !== undefined ? change24h.toFixed(2) : 'n/a';
              const volumeLog = volume24h !== undefined ? (volume24h / 1_000_000).toFixed(2) : 'n/a';
              console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeLog}%) Vol: $${volumeLog}M`);
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

export const bybitFuturesService = createBybitFuturesService();

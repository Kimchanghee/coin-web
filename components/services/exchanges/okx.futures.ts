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

const createOKXFuturesService = (): ExchangeService => {
  const id = 'okx_usdt_futures';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to OKX Futures WebSocket...`);
        ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE',
            'MATIC', 'DOT', 'AVAX', 'SHIB', 'TRX', 'LTC',
            'BCH', 'LINK', 'UNI'
          ];
          
          const args = symbols.map(symbol => ({
            channel: 'tickers',
            instId: `${symbol}-USDT-SWAP`
          }));
          
          const subscribeMsg = {
            op: 'subscribe',
            args: args
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (!data.arg || data.arg.channel !== 'tickers' || !Array.isArray(data.data)) {
              return;
            }

            data.data.forEach((ticker: any) => {
              const instId: string | undefined = ticker?.instId;
              const symbol = normalizeSymbol(instId);
              if (!symbol) {
                return;
              }

              const lastPrice = safeParseNumber(ticker.last);
              if (lastPrice === undefined || lastPrice <= 0) {
                return;
              }

              const change24h = deriveChangePercent({
                percent: ticker.sodUtc0ChangePercent ?? ticker.changePercent,
                ratio: ticker.sodUtc0ChangePercent ?? ticker.changeRatio,
                priceChange: ticker.sodUtc0Change ?? ticker.change24h,
                openPrice: ticker.open24h ?? ticker.open,
                lastPrice,
              });

              const volume24h = deriveQuoteVolume(
                ticker.volCcy24h,
                ticker.vol24h,
                lastPrice
              );

              callback({
                priceKey: `${id}-${symbol}`,
                price: lastPrice,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
              });

              if (Math.random() < 0.05) {
                const changeLog = change24h !== undefined ? change24h.toFixed(2) : 'n/a';
                const volumeLog = volume24h !== undefined ? (volume24h / 1_000_000).toFixed(2) : 'n/a';
                console.log(`📊 [${id}] ${symbol}: $${lastPrice.toFixed(2)} (${changeLog}%) Vol: $${volumeLog}M`);
              }
            });
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

export const okxFuturesService = createOKXFuturesService();

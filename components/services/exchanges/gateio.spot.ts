import type { ExchangeService, ExtendedPriceUpdate, PriceUpdateCallback } from '../../../types';
import { deriveChangePercent, deriveQuoteVolume, safeParseNumber } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createGateioSpotService = (): ExchangeService => {
  const id = 'gateio_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Gate.io Spot WebSocket...`);
        ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTC_USDT', 'ETH_USDT', 'SOL_USDT', 'XRP_USDT', 'ADA_USDT',
            'DOGE_USDT', 'MATIC_USDT', 'DOT_USDT', 'AVAX_USDT', 'SHIB_USDT',
            'TRX_USDT', 'LTC_USDT', 'BCH_USDT', 'LINK_USDT', 'UNI_USDT'
          ];
          
          const subscribeMsg = {
            time: Math.floor(Date.now() / 1000),
            channel: 'spot.tickers',
            event: 'subscribe',
            payload: symbols
          };
          
          ws?.send(JSON.stringify(subscribeMsg));
          console.log(`📡 [${id}] Subscription sent`);
          
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                time: Math.floor(Date.now() / 1000),
                channel: 'spot.ping'
              }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.channel !== 'spot.tickers' || data.event !== 'update' || !data.result) {
              return;
            }

            const ticker = data.result;
            const pair: string | undefined = ticker?.currency_pair;
            if (!pair) {
              return;
            }

            const symbol = pair.split('_')[0];
            const price = safeParseNumber(ticker.last);
            if (price === undefined || price <= 0) {
              return;
            }

            const change24h = deriveChangePercent({
              percent: ticker.change_percentage ?? ticker.changePercent,
              ratio: ticker.changeRatio,
              priceChange: ticker.change,
              openPrice: ticker.open,
              lastPrice: price,
            });
            const volume24h = deriveQuoteVolume(
              ticker.quote_volume,
              ticker.base_volume,
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

export const gateioSpotService = createGateioSpotService();
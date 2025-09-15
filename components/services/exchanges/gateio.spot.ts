import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

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
            
            if (data.channel === 'spot.tickers' && data.event === 'update' && data.result) {
              const ticker = data.result;
              const symbol = ticker.currency_pair.split('_')[0];
              const price = parseFloat(ticker.last);
              const change24h = parseFloat(ticker.change_percentage);
              const volume24h = parseFloat(ticker.quote_volume);
              
              callback({
                priceKey: `${id}-${symbol}`,
                price: price,
                change24h: change24h,
                volume24h: volume24h
              });
              
              if (Math.random() < 0.05) {
                console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${change24h.toFixed(2)}%) Vol: $${(volume24h/1000000).toFixed(2)}M`);
              }
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
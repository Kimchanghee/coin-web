import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createOKXSpotService = (): ExchangeService => {
  const id = 'okx_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to OKX Spot WebSocket...`);
        ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE',
            'MATIC', 'DOT', 'AVAX', 'SHIB', 'TRX', 'LTC',
            'BCH', 'LINK', 'UNI', 'ATOM', 'XLM', 'ALGO',
            'NEAR', 'FIL'
          ];
          
          const args = symbols.map(symbol => ({
            channel: 'tickers',
            instId: `${symbol}-USDT`
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
            
            if (data.arg && data.arg.channel === 'tickers' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('-')[0];
                const price = parseFloat(ticker.last);
                const change24h = ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h)) * 100;
                const volume24h = parseFloat(ticker.volCcy24h);
                
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price,
                  change24h: change24h,
                  volume24h: volume24h
                });
                
                if (Math.random() < 0.05) {
                  console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${change24h.toFixed(2)}%) Vol: $${(volume24h/1000000).toFixed(2)}M`);
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

export const okxSpotService = createOKXSpotService();
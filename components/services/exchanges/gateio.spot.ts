import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createGateioSpotService = (): ExchangeService => {
  const id = 'gateio_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  let pingInterval: number | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Gate.io Spot WebSocket...`);
        ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully!`);
          
          // Gate.io v4 subscription
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
          console.log(`[${id}] Subscription sent`);
          
          // Ping 전송 (30초마다)
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
            
            // ticker 데이터 처리
            if (data.channel === 'spot.tickers' && data.event === 'update' && data.result) {
              const ticker = data.result;
              const symbol = ticker.currency_pair.split('_')[0];
              const price = parseFloat(ticker.last);
              
              callback({
                priceKey: `${id}-${symbol}`,
                price: price
              });
              
              // 디버깅용 로그
              if (Math.random() < 0.01) {
                console.log(`[${id}] ${symbol}: $${price.toFixed(2)}`);
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
          console.log(`[${id}] WebSocket disconnected. Code: ${event.code}`);
          
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

export const gateioSpotService = createGateioSpotService();
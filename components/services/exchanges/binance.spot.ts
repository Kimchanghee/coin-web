// components/services/exchanges/binance.spot.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBinanceSpotService = (): ExchangeService => {
  const id = 'binance_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | undefined;
  
  // Binance에서 거래되는 주요 코인들 (USDT 페어)
  const symbols = ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'matic', 'dot', 
                   'avax', 'shib', 'trx', 'ltc', 'bch', 'link', 'uni', 'atom', 
                   'xlm', 'algo', 'near', 'fil', 'sand', 'mana', 'aave', 'grt', 
                   'ftm', 'vet', 'icp', 'hbar', 'xtz', 'eos', 'mkr', 'enj'];
  
  // Binance WebSocket streams 형식
  const streams = symbols.map(s => `${s}usdt@ticker`).join('/');

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`[${id}] Connecting to Binance Spot WebSocket...`);
        
        // Binance Spot WebSocket endpoint
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`[${id}] WebSocket connected successfully`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Binance stream 데이터 형식
            if (data.stream && data.data) {
              const ticker = data.data;
              // s: symbol (e.g., "BTCUSDT")
              // c: current price (last price)
              // P: price change percent
              // v: volume
              
              const symbol = ticker.s.replace('USDT', '').toUpperCase();
              const price = parseFloat(ticker.c);
              
              callback({
                priceKey: `${id}-${symbol}`,
                price: price
              });
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
          ws = null;
          
          // 3초 후 재연결
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = undefined;
              connectWebSocket();
            }, 3000);
          }
        };

        // Binance는 자동으로 ping/pong을 처리하므로 별도 구현 불필요
        
      } catch (error) {
        console.error(`[${id}] Failed to connect:`, error);
        
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = undefined;
            connectWebSocket();
          }, 3000);
        }
      }
    };

    connectWebSocket();
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting...`);
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, disconnect };
};

export const binanceSpotService = createBinanceSpotService();
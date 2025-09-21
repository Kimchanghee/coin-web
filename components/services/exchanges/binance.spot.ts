// components/services/exchanges/binance.spot.ts - 확장 데이터 추가

import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';
import { safeParseNumber, safeMultiply } from './utils';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBinanceSpotService = (): ExchangeService => {
  const id = 'binance_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  
  // 확장 데이터를 위한 추가 상태
  const priceHistory: { [symbol: string]: number[] } = {};
  const volumeData: { [symbol: string]: number } = {};
  
  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Binance Spot WebSocket...`);
        
        const symbols = [
          'btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'adausdt', 
          'dogeusdt', 'maticusdt', 'dotusdt', 'avaxusdt', 'shibusdt',
          'trxusdt', 'ltcusdt', 'bchusdt', 'linkusdt', 'uniusdt',
          'atomusdt', 'xlmusdt', 'algousdt', 'nearusdt', 'filusdt',
        ];
        
        // 24hr ticker 스트림 사용하여 더 많은 정보 획득
        const streams = symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.stream && message.data) {
              const data = message.data;
              const symbol = data.s.replace('USDT', '');
              const price = safeParseNumber(data.c);
              const change24h = safeParseNumber(data.P);
              const quoteVolume = safeParseNumber(data.q);
              const baseVolume = safeParseNumber(data.v);
              const volume24h =
                quoteVolume !== undefined
                  ? quoteVolume
                  : baseVolume !== undefined && price !== undefined
                  ? safeMultiply(baseVolume, price)
                  : undefined;

              if (price === undefined) {
                return;
              }

              // 가격 히스토리 추적 (간단한 변동률 계산용)
              if (!priceHistory[symbol]) {
                priceHistory[symbol] = [];
              }
              priceHistory[symbol].push(price);
              if (priceHistory[symbol].length > 100) {
                priceHistory[symbol].shift(); // 최대 100개 유지
              }

              const update: ExtendedPriceUpdate = {
                priceKey: `${id}-${symbol}`,
                price,
                ...(change24h !== undefined ? { change24h } : {}),
                ...(volume24h !== undefined ? { volume24h } : {}),
              };

              callback(update);

              // 디버깅용 로그 (주요 코인만)
              if ((symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') && Math.random() < 0.05) {
                const changeText = change24h !== undefined ? change24h.toFixed(2) : 'N/A';
                const volumeText = volume24h !== undefined ? volume24h.toFixed(0) : 'N/A';
                console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${changeText}%) Vol: ${volumeText}`);
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
          ws = null;
          
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 [${id}] Attempting to reconnect...`);
            connectWebSocket();
          }, 5000);
        };
        
      } catch (error) {
        console.error(`❌ [${id}] Failed to connect:`, error);
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
    console.log(`🛑 [${id}] Disconnecting service...`);
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = undefined;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const binanceSpotService = createBinanceSpotService();

// =============================================================================

// components/services/exchanges/bybit.spot.ts - 확장 데이터 추가

const createBybitSpotService = (): ExchangeService => {
  const id = 'bybit_usdt_spot';
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        console.log(`🏢 [${id}] Connecting to Bybit Spot WebSocket...`);
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
        
        ws.onopen = () => {
          console.log(`✅ [${id}] WebSocket connected successfully!`);
          
          const symbols = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT', 'SHIBUSDT',
            'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'LINKUSDT', 'UNIUSDT',
            'ATOMUSDT', 'XLMUSDT', 'ALGOUSDT', 'NEARUSDT', 'FILUSDT'
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
            
            if (data.topic && data.topic.startsWith('tickers.')) {
              if (data.data) {
                const tickerData = data.data;
                const symbol = tickerData.symbol.replace('USDT', '');
                const price = parseFloat(tickerData.lastPrice);
                const change24h = parseFloat(tickerData.price24hPcnt) * 100; // Convert to percentage
                const volume24h = parseFloat(tickerData.turnover24h) || parseFloat(tickerData.volume24h) * price;
                
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price,
                  change24h: change24h,
                  volume24h: volume24h
                });
                
                if ((symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') && Math.random() < 0.05) {
                  console.log(`📊 [${id}] ${symbol}: $${price.toFixed(2)} (${change24h.toFixed(2)}%) Vol: ${volume24h.toFixed(0)}`);
                }
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
          }, 5000);
        };
        
      } catch (error) {
        console.error(`❌ [${id}] Failed to connect:`, error);
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

export const bybitSpotService = createBybitSpotService();
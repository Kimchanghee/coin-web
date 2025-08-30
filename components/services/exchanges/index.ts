// components/services/exchanges/index.ts
import { upbitService } from './upbit';
import { bithumbService } from './bithumb';
import { coinoneService } from './coinone';
import { binanceSpotService } from './binance.spot';
import { binanceFuturesService } from './binance.futures';
import { bitgetSpotService } from './bitget.spot';
import { bitgetFuturesService } from './bitget.futures';
import { bybitSpotService } from './bybit.spot';
import { bybitFuturesService } from './bybit.futures';
import { okxSpotService } from './okx.spot';
import { okxFuturesService } from './okx.futures';
import { gateioSpotService } from './gateio.spot';
import { gateioFuturesService } from './gateio.futures';

export const domesticServices = [upbitService, bithumbService, coinoneService];

export const overseasServices = [
    binanceSpotService, 
    binanceFuturesService,
    bitgetSpotService,
    bitgetFuturesService,
    bybitSpotService,
    bybitFuturesService,
    okxSpotService,
    okxFuturesService,
    gateioSpotService,
    gateioFuturesService
];

export const allServices = [...domesticServices, ...overseasServices];

// ===== 1. UPBIT (WebSocket) =====
// components/services/exchanges/upbit.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

export const createUpbitService = (): ExchangeService => {
  const id = 'upbit_krw';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT', 
                   'AVAX', 'SHIB', 'TRX', 'LTC', 'BCH', 'LINK', 'UNI', 'ATOM'];
  const upbitSymbols = symbols.map(s => `KRW-${s}`);

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'blob';
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          ws?.send(JSON.stringify([
            { ticket: 'upbit-ticker' },
            { type: 'ticker', codes: upbitSymbols, isOnlyRealtime: true },
            { format: 'DEFAULT' }
          ]));
        };

        ws.onmessage = async (event) => {
          try {
            const data = event.data instanceof Blob 
              ? JSON.parse(await event.data.text())
              : JSON.parse(event.data);
            
            if (data.type === 'ticker') {
              callback({
                priceKey: `${id}-${data.code.replace('KRW-', '')}`,
                price: data.trade_price
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error(`[${id}] Connection error:`, error);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 2. BITHUMB (REST API Polling) =====
// components/services/exchanges/bithumb.ts
export const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  
  const connect = (callback: PriceUpdateCallback) => {
    const fetchPrices = async () => {
      try {
        // CORS 이슈로 프록시 필요
        const response = await fetch('/api/proxy/bithumb');
        const data = await response.json();
        
        if (data.status === '0000') {
          Object.keys(data.data).forEach(symbol => {
            if (symbol !== 'date' && data.data[symbol]) {
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.data[symbol].closing_price)
              });
            }
          });
        }
      } catch (error) {
        console.error(`[${id}] Fetch error:`, error);
      }
    };

    fetchPrices();
    intervalId = setInterval(fetchPrices, 2000);
  };

  const disconnect = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return { id, connect, disconnect };
};

// ===== 3. COINONE (REST API Polling) =====
// components/services/exchanges/coinone.ts
export const createCoinoneService = (): ExchangeService => {
  const id = 'coinone_krw';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  
  const connect = (callback: PriceUpdateCallback) => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/proxy/coinone');
        const data = await response.json();
        
        if (data.result === 'success') {
          Object.keys(data).forEach(key => {
            if (key !== 'result' && key !== 'timestamp') {
              const symbol = key.toUpperCase();
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data[key].last)
              });
            }
          });
        }
      } catch (error) {
        console.error(`[${id}] Fetch error:`, error);
      }
    };

    fetchPrices();
    intervalId = setInterval(fetchPrices, 2000);
  };

  const disconnect = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return { id, connect, disconnect };
};

// ===== 4. BINANCE SPOT (WebSocket) =====
// components/services/exchanges/binance.spot.ts
export const createBinanceSpotService = (): ExchangeService => {
  const id = 'binance_usdt_spot';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  
  const symbols = ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'matic', 'dot', 
                   'avax', 'shib', 'trx', 'ltc', 'bch', 'link', 'uni', 'atom'];
  const streams = symbols.map(s => `${s}usdt@ticker`).join('/');

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
        
        ws.onopen = () => console.log(`[${id}] Connected`);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.stream && data.data) {
              const symbol = data.data.s.replace('USDT', '');
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.data.c)
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error(`[${id}] Connection error:`, error);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 5. BINANCE FUTURES (WebSocket) =====
// components/services/exchanges/binance.futures.ts
export const createBinanceFuturesService = (): ExchangeService => {
  const id = 'binance_usdt_futures';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  
  const symbols = ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'matic', 'dot'];
  const streams = symbols.map(s => `${s}usdt@ticker`).join('/');

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
        
        ws.onopen = () => console.log(`[${id}] Connected`);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.stream && data.data) {
              const symbol = data.data.s.replace('USDT', '');
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.data.c)
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 6. BYBIT SPOT (WebSocket) =====
// components/services/exchanges/bybit.spot.ts
export const createBybitSpotService = (): ExchangeService => {
  const id = 'bybit_usdt_spot';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let pingInterval: ReturnType<typeof setInterval> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 
                          'DOGEUSDT', 'MATICUSDT', 'DOTUSDT'];
          ws?.send(JSON.stringify({
            op: 'subscribe',
            args: symbols.map(s => `tickers.${s}`)
          }));
          
          pingInterval = setInterval(() => {
            ws?.send(JSON.stringify({ op: 'ping' }));
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.topic && data.topic.startsWith('tickers.')) {
              const symbol = data.data.symbol.replace('USDT', '');
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.data.lastPrice)
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (pingInterval) clearInterval(pingInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 7. BYBIT FUTURES (WebSocket) =====
// components/services/exchanges/bybit.futures.ts
export const createBybitFuturesService = (): ExchangeService => {
  const id = 'bybit_usdt_futures';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
          ws?.send(JSON.stringify({
            op: 'subscribe',
            args: symbols.map(s => `tickers.${s}`)
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.topic && data.data) {
              const symbol = data.data.symbol.replace('USDT', '');
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.data.lastPrice)
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 8. OKX SPOT (WebSocket) =====
// components/services/exchanges/okx.spot.ts
export const createOKXSpotService = (): ExchangeService => {
  const id = 'okx_usdt_spot';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'];
          ws?.send(JSON.stringify({
            op: 'subscribe',
            args: symbols.map(s => ({ channel: 'tickers', instId: `${s}-USDT` }))
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.arg?.channel === 'tickers' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('-')[0];
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: parseFloat(ticker.last)
                });
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 9. OKX FUTURES (WebSocket) =====
// components/services/exchanges/okx.futures.ts
export const createOKXFuturesService = (): ExchangeService => {
  const id = 'okx_usdt_futures';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          const symbols = ['BTC', 'ETH', 'SOL', 'XRP'];
          ws?.send(JSON.stringify({
            op: 'subscribe',
            args: symbols.map(s => ({ channel: 'tickers', instId: `${s}-USDT-SWAP` }))
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.arg?.channel === 'tickers' && data.data) {
              data.data.forEach((ticker: any) => {
                const symbol = ticker.instId.split('-')[0];
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: parseFloat(ticker.last)
                });
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 10. GATE.IO SPOT (WebSocket) =====
// components/services/exchanges/gateio.spot.ts
export const createGateioSpotService = (): ExchangeService => {
  const id = 'gateio_usdt_spot';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          const symbols = ['BTC_USDT', 'ETH_USDT', 'SOL_USDT', 'XRP_USDT'];
          ws?.send(JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel: 'spot.tickers',
            event: 'subscribe',
            payload: symbols
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.channel === 'spot.tickers' && data.result) {
              const symbol = data.result.currency_pair.split('_')[0];
              callback({
                priceKey: `${id}-${symbol}`,
                price: parseFloat(data.result.last)
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 11. GATE.IO FUTURES (WebSocket) =====
// components/services/exchanges/gateio.futures.ts
export const createGateioFuturesService = (): ExchangeService => {
  const id = 'gateio_usdt_futures';
  let ws: WebSocket | null = null;
  // FIX: Changed type from 'number' to a type compatible with setTimeout's return value in all environments.
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://fx-ws.gateio.ws/v4/ws/usdt');
        
        ws.onopen = () => {
          console.log(`[${id}] Connected`);
          const symbols = ['BTC_USDT', 'ETH_USDT', 'SOL_USDT'];
          ws?.send(JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel: 'futures.tickers',
            event: 'subscribe',
            payload: symbols
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.channel === 'futures.tickers' && data.result) {
              data.result.forEach((ticker: any) => {
                const symbol = ticker.contract.split('_')[0];
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: parseFloat(ticker.last)
                });
              });
            }
          } catch (error) {
            console.error(`[${id}] Parse error:`, error);
          }
        };

        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };
    connectWebSocket();
  };

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };

  return { id, connect, disconnect };
};

// ===== 12. BITGET SPOT (REST API) =====
// components/services/exchanges/bitget.spot.ts
export const createBitgetSpotService = (): ExchangeService => {
  const id = 'bitget_usdt_spot';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const fetchPrices = async () => {
      try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
        for (const symbol of symbols) {
          const response = await fetch(`/api/proxy/bitget/spot/${symbol}`);
          const data = await response.json();
          if (data.code === '00000') {
            callback({
              priceKey: `${id}-${symbol.replace('USDT', '')}`,
              price: parseFloat(data.data.lastPr)
            });
          }
        }
      } catch (error) {
        console.error(`[${id}] Fetch error:`, error);
      }
    };

    fetchPrices();
    intervalId = setInterval(fetchPrices, 2000);
  };

  const disconnect = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return { id, connect, disconnect };
};

// ===== 13. BITGET FUTURES (REST API) =====
// components/services/exchanges/bitget.futures.ts
export const createBitgetFuturesService = (): ExchangeService => {
  const id = 'bitget_usdt_futures';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const connect = (callback: PriceUpdateCallback) => {
    const fetchPrices = async () => {
      try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
        for (const symbol of symbols) {
          const response = await fetch(`/api/proxy/bitget/futures/${symbol}`);
          const data = await response.json();
          if (data.code === '00000') {
            callback({
              priceKey: `${id}-${symbol.replace('USDT', '')}`,
              price: parseFloat(data.data.last)
            });
          }
        }
      } catch (error) {
        console.error(`[${id}] Fetch error:`, error);
      }
    };

    fetchPrices();
    intervalId = setInterval(fetchPrices, 2000);
  };

  const disconnect = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return { id, connect, disconnect };
};
// components/services/exchanges/bithumb.ts - 확장 데이터 개선

import type { ExchangeService, PriceUpdateCallback, ExtendedPriceUpdate } from '../../../types';

type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;
  
  // 시뮬레이션용 베이스 가격과 거래대금
  const basePrices: { [key: string]: number } = {
    'BTC': 156878000, 'ETH': 6256000, 'SOL': 292000, 'XRP': 847, 'ADA': 650,
    'DOGE': 220, 'MATIC': 980, 'DOT': 9500, 'AVAX': 45000, 'SHIB': 0.035,
    'TRX': 160, 'LTC': 115000, 'BCH': 650000, 'LINK': 34680, 'UNI': 14000,
    'ATOM': 12000, 'XLM': 160, 'ALGO': 250, 'NEAR': 7500, 'FIL': 7800,
  };

  const baseVolumes: { [key: string]: number } = {
    'BTC': 1973000000000, 'ETH': 4373000000000, 'SOL': 2600000000000, 'XRP': 5874000000000, 'ADA': 1234000000000,
    'DOGE': 987000000000, 'MATIC': 876000000000, 'DOT': 765000000000, 'AVAX': 1123000000000, 'SHIB': 654000000000,
    'TRX': 543000000000, 'LTC': 987000000000, 'BCH': 1010000000000, 'LINK': 1303000000000, 'UNI': 654000000000,
    'ATOM': 654000000000, 'XLM': 432000000000, 'ALGO': 321000000000, 'NEAR': 987000000000, 'FIL': 789000000000,
  };
  
  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    isActive = true;
    console.log(`🏢 [${id}] Starting extended connection...`);
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      try {
        // 실제 API 시도 (대부분 CORS로 실패)
        const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === '0000' && data.data) {
            console.log(`✅ [${id}] Real API data received`);
            Object.keys(data.data).forEach(symbol => {
              if (symbol !== 'date' && data.data[symbol]) {
                const priceData = data.data[symbol];
                const price = parseFloat(priceData.closing_price);
                const change24h = parseFloat(priceData['24H_fluctate_rate']) || 0;
                const volume24h = parseFloat(priceData.acc_trade_value_24H) || 0;
                
                if (!isNaN(price) && price > 0) {
                  callback({
                    priceKey: `${id}-${symbol}`,
                    price: price,
                    change24h: change24h,
                    volume24h: volume24h
                  });
                }
              }
            });
            return;
          }
        }
        
        throw new Error('API failed, using simulation');
        
      } catch (error) {
        // CORS 에러 또는 API 실패시 시뮬레이션 데이터 사용
        console.log(`🎲 [${id}] Using simulated extended data`);
        
        const baseTime = Date.now();
        const marketTrend = Math.sin(baseTime / 30000) * 0.02; // 30초 주기 시장 트렌드
        
        Object.entries(basePrices).forEach(([symbol, basePrice]) => {
          const volatility = symbol === 'BTC' ? 0.01 : 
                           symbol === 'ETH' ? 0.015 : 
                           symbol === 'SHIB' ? 0.03 : 0.02;
          
          const timeVariation = Math.sin(baseTime / 10000 + symbol.charCodeAt(0)) * volatility;
          const randomNoise = (Math.random() - 0.5) * 0.002;
          
          const price = basePrice * (1 + marketTrend + timeVariation + randomNoise);
          const change24h = (marketTrend + timeVariation) * 100 + (Math.random() - 0.5) * 2;
          const volume24h = (baseVolumes[symbol] || 1000000000000) * (1 + marketTrend + (Math.random() - 0.5) * 0.1);
          
          callback({
            priceKey: `${id}-${symbol}`,
            price: Math.max(price, 0.001),
            change24h: change24h,
            volume24h: volume24h
          });
        });
        
        if (Math.random() < 0.1) {
          console.log(`📊 [${id}] Sample data - BTC: ₩${Math.round(basePrices['BTC'] * (1 + marketTrend)).toLocaleString('ko-KR')}`);
        }
      }
    };

    console.log(`🚀 [${id}] Starting data fetch...`);
    fetchData();
    intervalId = setInterval(fetchPrices, 1000); // 1초마다 업데이트
  };
  
  // 기본 connect (하위 호환성)
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
    isActive = false;
    
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const bithumbService = createBithumbService();

// =============================================================================

// components/services/exchanges/coinone.ts - 확장 데이터 개선

const createCoinoneService = (): ExchangeService => {
  const id = 'coinone_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;

  // 시뮬레이션용 베이스 가격 (빗썸과 유사하지만 약간 다른 가격)
  const basePrices: { [key: string]: number } = {
    'BTC': 156890000, 'ETH': 6258000, 'SOL': 292500, 'XRP': 848, 'ADA': 651,
    'DOGE': 221, 'MATIC': 982, 'DOT': 9520, 'AVAX': 45100, 'SHIB': 0.0351,
    'TRX': 161, 'LTC': 115200, 'BCH': 651000, 'LINK': 34700, 'UNI': 14050,
  };

  const baseVolumes: { [key: string]: number } = {
    'BTC': 1500000000000, 'ETH': 3500000000000, 'SOL': 2000000000000, 'XRP': 4500000000000, 'ADA': 1000000000000,
    'DOGE': 800000000000, 'MATIC': 700000000000, 'DOT': 600000000000, 'AVAX': 900000000000, 'SHIB': 500000000000,
  };

  const connectExtended = (callback: ExtendedPriceUpdateCallback) => {
    isActive = true;
    console.log(`🏢 [${id}] Starting extended connection...`);
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      console.log(`🎲 [${id}] Using simulated extended data (CORS restrictions)`);
      
      const baseTime = Date.now();
      const marketTrend = Math.sin(baseTime / 25000) * 0.018; // 25초 주기
      const microTrend = Math.cos(baseTime / 5000) * 0.003; // 5초 마이크로 트렌드
      
      Object.entries(basePrices).forEach(([symbol, basePrice]) => {
        const volatility = symbol === 'BTC' ? 0.008 : 
                         symbol === 'ETH' ? 0.012 : 
                         symbol === 'SHIB' ? 0.025 : 
                         symbol === 'DOGE' ? 0.02 : 0.015;
        
        const phase = symbol.charCodeAt(0) + symbol.charCodeAt(1) * 0.1;
        const timeVariation = Math.sin(baseTime / 12000 + phase) * volatility;
        const randomNoise = (Math.random() - 0.5) * 0.0015;
        
        const price = basePrice * (1 + marketTrend + microTrend + timeVariation + randomNoise);
        const change24h = (marketTrend + microTrend + timeVariation) * 100 + (Math.random() - 0.5) * 1.5;
        const volume24h = (baseVolumes[symbol] || 800000000000) * (1 + marketTrend + microTrend + (Math.random() - 0.5) * 0.1);
        
        callback({
          priceKey: `${id}-${symbol}`,
          price: Math.max(price, 0.001),
          change24h: change24h,
          volume24h: volume24h
        });
      });
      
      if (Math.random() < 0.15) {
        const btcPrice = basePrices['BTC'] * (1 + marketTrend + microTrend);
        const btcChange = (marketTrend + microTrend) * 100;
        console.log(`📊 [${id}] Sample - BTC: ₩${Math.round(btcPrice).toLocaleString('ko-KR')} (${btcChange.toFixed(2)}%)`);
      }
    };

    console.log(`🚀 [${id}] Starting simulated data...`);
    fetchPrices();
    intervalId = setInterval(fetchPrices, 1000);
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
    isActive = false;
    
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, connectExtended, disconnect };
};

export const coinoneService = createCoinoneService();
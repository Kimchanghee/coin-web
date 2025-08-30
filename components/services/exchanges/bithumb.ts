// components/services/exchanges/bithumb.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;
  
  // 시뮬레이션용 베이스 가격
  const basePrices: { [key: string]: number } = {
    'BTC': 156878000,
    'ETH': 6256000,
    'SOL': 292000,
    'XRP': 847,
    'ADA': 650,
    'DOGE': 220,
    'MATIC': 980,
    'DOT': 9500,
    'AVAX': 45000,
    'SHIB': 0.035,
    'TRX': 160,
    'LTC': 115000,
    'BCH': 650000,
    'LINK': 34680,
    'UNI': 14000,
    'ATOM': 12000,
    'XLM': 160,
    'ALGO': 250,
    'NEAR': 7500,
    'FIL': 7800,
    'SAND': 600,
    'MANA': 620,
    'AAVE': 125000,
    'GRT': 400,
    'FTM': 800,
    'VET': 45,
    'ICP': 16000,
    'HBAR': 110,
    'XTZ': 1300,
    'EOS': 1100,
    'MKR': 3200000,
    'ENJ': 450,
    'BAT': 350,
    'ZEC': 40000,
    'KAVA': 900
  };
  
  const connect = (callback: PriceUpdateCallback) => {
    isActive = true;
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      try {
        // 직접 API 호출 시도 (CORS 문제로 대부분 실패)
        const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
        
        if (!response.ok || response.status === 404) {
          throw new Error('API call failed, using simulation');
        }
        
        const data = await response.json();
        
        if (data.status === '0000' && data.data) {
          // 실제 API 데이터 처리
          Object.keys(data.data).forEach(symbol => {
            if (symbol !== 'date' && data.data[symbol]) {
              const priceData = data.data[symbol];
              const price = parseFloat(priceData.closing_price);
              
              if (!isNaN(price) && price > 0) {
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price
                });
                
                // 디버깅용 로그
                if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') {
                  console.log(`[${id}] ${symbol}: ₩${price.toLocaleString('ko-KR')} (API)`);
                }
              }
            }
          });
          
          console.log(`[${id}] Real API data updated at ${new Date().toLocaleTimeString('ko-KR')}`);
        } else {
          throw new Error('Invalid API response');
        }
      } catch (error) {
        // CORS 에러 또는 API 실패시 시뮬레이션 데이터 사용
        console.log(`[${id}] Using simulated data (CORS/API error)`);
        
        const baseTime = Date.now();
        const marketTrend = Math.sin(baseTime / 30000) * 0.02; // 30초 주기 시장 트렌드
        
        Object.entries(basePrices).forEach(([symbol, basePrice]) => {
          // 각 코인별로 다른 변동성 적용
          const volatility = symbol === 'BTC' ? 0.01 : 
                           symbol === 'ETH' ? 0.015 : 
                           symbol === 'SHIB' ? 0.03 : 0.02;
          
          // 시간 기반 변동 + 랜덤 노이즈
          const timeVariation = Math.sin(baseTime / 10000 + symbol.charCodeAt(0)) * volatility;
          const randomNoise = (Math.random() - 0.5) * 0.002;
          
          const price = basePrice * (1 + marketTrend + timeVariation + randomNoise);
          
          callback({
            priceKey: `${id}-${symbol}`,
            price: Math.max(price, 0.001) // 음수 방지
          });
        });
        
        // 주요 코인 가격 로그
        if (Math.random() < 0.1) { // 10% 확률로 로그 출력
          const btcPrice = basePrices['BTC'] * (1 + marketTrend);
          const ethPrice = basePrices['ETH'] * (1 + marketTrend);
          const solPrice = basePrices['SOL'] * (1 + marketTrend);
          
          console.log(`[${id}] BTC: ₩${Math.round(btcPrice).toLocaleString('ko-KR')} (Sim)`);
          console.log(`[${id}] ETH: ₩${Math.round(ethPrice).toLocaleString('ko-KR')} (Sim)`);
          console.log(`[${id}] SOL: ₩${Math.round(solPrice).toLocaleString('ko-KR')} (Sim)`);
        }
      }
    };

    // 초기 실행
    console.log(`[${id}] Starting service...`);
    fetchPrices();
    
    // 2초마다 업데이트
    intervalId = setInterval(fetchPrices, 2000);
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting service...`);
    isActive = false;
    
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, disconnect };
};

export const bithumbService = createBithumbService();
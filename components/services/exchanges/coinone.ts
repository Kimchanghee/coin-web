// components/services/exchanges/coinone.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createCoinoneService = (): ExchangeService => {
  const id = 'coinone_krw';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;

  // 시뮬레이션용 베이스 가격 (빗썸과 유사하지만 약간 다른 가격)
  const basePrices: { [key: string]: number } = {
    'BTC': 156890000,  // 빗썸보다 약간 높음
    'ETH': 6258000,
    'SOL': 292500,
    'XRP': 848,
    'ADA': 651,
    'DOGE': 221,
    'MATIC': 982,
    'DOT': 9520,
    'AVAX': 45100,
    'SHIB': 0.0351,
    'TRX': 161,
    'LTC': 115200,
    'BCH': 651000,
    'LINK': 34700,
    'UNI': 14050,
    'ATOM': 12050,
    'XLM': 161,
    'ALGO': 252,
    'NEAR': 7520,
    'FIL': 7820,
    'SAND': 602,
    'MANA': 622,
    'AAVE': 125500,
    'GRT': 402,
    'FTM': 802,
    'VET': 45.5,
    'ICP': 16100,
    'HBAR': 111,
    'XTZ': 1305,
    'EOS': 1105,
    'MKR': 3210000,
    'ENJ': 452,
    'BAT': 352,
    'ZEC': 40100,
    'KAVA': 902
  };

  const connect = (callback: PriceUpdateCallback) => {
    isActive = true;
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      // Coinone API는 CORS 제약이 강해서 주로 시뮬레이션 사용
      console.log(`[${id}] Using simulated data (CORS restrictions)`);
      
      const baseTime = Date.now();
      // 코인원만의 독특한 시장 패턴 (빗썸과 다른 주기)
      const marketTrend = Math.sin(baseTime / 25000) * 0.018; // 25초 주기
      const microTrend = Math.cos(baseTime / 5000) * 0.003; // 5초 마이크로 트렌드
      
      Object.entries(basePrices).forEach(([symbol, basePrice]) => {
        // 코인원 특유의 변동성 (빗썸과 약간 다름)
        const volatility = symbol === 'BTC' ? 0.008 : 
                         symbol === 'ETH' ? 0.012 : 
                         symbol === 'SHIB' ? 0.025 : 
                         symbol === 'DOGE' ? 0.02 : 0.015;
        
        // 시간 기반 변동 (코인별로 다른 위상)
        const phase = symbol.charCodeAt(0) + symbol.charCodeAt(1) * 0.1;
        const timeVariation = Math.sin(baseTime / 12000 + phase) * volatility;
        
        // 랜덤 노이즈 (거래소별 특성)
        const randomNoise = (Math.random() - 0.5) * 0.0015;
        
        // 최종 가격 계산
        const price = basePrice * (1 + marketTrend + microTrend + timeVariation + randomNoise);
        
        callback({
          priceKey: `${id}-${symbol}`,
          price: Math.max(price, 0.001) // 음수 방지
        });
      });
      
      // 주요 코인 가격 로그 (15% 확률)
      if (Math.random() < 0.15) {
        const btcPrice = basePrices['BTC'] * (1 + marketTrend + microTrend);
        const ethPrice = basePrices['ETH'] * (1 + marketTrend + microTrend);
        const solPrice = basePrices['SOL'] * (1 + marketTrend + microTrend);
        
        console.log(`[${id}] BTC: ₩${Math.round(btcPrice).toLocaleString('ko-KR')}`);
        console.log(`[${id}] ETH: ₩${Math.round(ethPrice).toLocaleString('ko-KR')}`);
        console.log(`[${id}] SOL: ₩${Math.round(solPrice).toLocaleString('ko-KR')}`);
      }
    };

    // 초기 실행
    console.log(`[${id}] Starting service with simulated data...`);
    fetchPrices();
    
    // 2.5초마다 업데이트 (빗썸과 다른 주기)
    intervalId = setInterval(fetchPrices, 2500);
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

export const coinoneService = createCoinoneService();
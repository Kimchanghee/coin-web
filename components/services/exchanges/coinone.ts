import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createCoinoneService = (): ExchangeService => {
  const id = 'coinone_krw';
  let intervalId: number | undefined;
  let isActive = false;

  const connect = (callback: PriceUpdateCallback) => {
    isActive = true;
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      try {
        // Vite 프록시를 통해 호출 (CORS 우회)
        const response = await fetch('/api/coinone/ticker?currency=all');
        
        if (!response.ok) {
          console.error(`[${id}] HTTP error! status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        if (data.result === 'success') {
          // 각 코인별로 가격 업데이트
          Object.keys(data).forEach(key => {
            // result, errorCode, timestamp 필드는 제외
            if (key !== 'result' && key !== 'errorCode' && key !== 'timestamp') {
              const symbol = key.toUpperCase();
              const coinData = data[key];
              
              if (coinData && coinData.last) {
                const price = parseFloat(coinData.last);
                
                if (!isNaN(price) && price > 0) {
                  callback({
                    priceKey: `${id}-${symbol}`,
                    price: price
                  });
                  
                  // 디버깅용 로그
                  if (Math.random() < 0.02) {
                    console.log(`[${id}] ${symbol}: ₩${price.toLocaleString('ko-KR')}`);
                  }
                }
              }
            }
          });
          
          console.log(`[${id}] Prices updated at ${new Date().toLocaleTimeString('ko-KR')}`);
        } else {
          console.error(`[${id}] API returned error:`, data);
        }
      } catch (error) {
        console.error(`[${id}] Error fetching prices:`, error);
      }
    };

    // 초기 실행
    console.log(`[${id}] Starting service with REST API polling...`);
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

export const coinoneService = createCoinoneService();
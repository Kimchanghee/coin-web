import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isActive = false;
  
  const connect = (callback: PriceUpdateCallback) => {
    isActive = true;
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      try {
        // Vite 프록시를 통해 호출 (CORS 우회)
        const response = await fetch('/api/bithumb/ticker/ALL_KRW');
        
        if (!response.ok) {
          console.error(`[${id}] HTTP error! status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        if (data.status === '0000' && data.data) {
          // 각 코인별로 가격 업데이트
          Object.keys(data.data).forEach(symbol => {
            // date 필드는 제외
            if (symbol !== 'date' && data.data[symbol]) {
              const priceData = data.data[symbol];
              const price = parseFloat(priceData.closing_price);
              
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
          });
          
          console.log(`[${id}] Prices updated at ${new Date().toLocaleTimeString('ko-KR')}`);
        } else {
          console.error(`[${id}] API returned error:`, data.status);
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

export const bithumbService = createBithumbService();
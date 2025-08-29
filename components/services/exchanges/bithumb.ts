// components/services/exchanges/bithumb.ts
import type { ExchangeService, PriceUpdateCallback } from '../../../types';

const createBithumbService = (): ExchangeService => {
  const id = 'bithumb_krw';
  let intervalId: number | undefined;
  let isActive = false;
  
  // Bithumb에서 거래되는 주요 코인들
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT', 
                   'AVAX', 'SHIB', 'TRX', 'LTC', 'BCH', 'LINK', 'UNI', 'ATOM', 
                   'XLM', 'ALGO', 'NEAR', 'FIL', 'SAND', 'MANA', 'AAVE', 'GRT'];

  const connect = (callback: PriceUpdateCallback) => {
    isActive = true;
    
    const fetchPrices = async () => {
      if (!isActive) return;
      
      try {
        // Bithumb Public API - 모든 코인 가격 조회
        // CORS 이슈가 있을 수 있으므로 프록시 서버를 통해 호출하거나
        // 백엔드 API를 통해 데이터를 가져와야 할 수 있습니다
        const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === '0000' && data.data) {
          // 각 코인별로 가격 업데이트
          symbols.forEach(symbol => {
            if (data.data[symbol]) {
              const priceData = data.data[symbol];
              const price = parseFloat(priceData.closing_price);
              
              if (!isNaN(price) && price > 0) {
                callback({
                  priceKey: `${id}-${symbol}`,
                  price: price
                });
              }
            }
          });
          
          // 날짜 정보도 사용 가능
          if (data.data.date) {
            console.log(`[${id}] Price updated at:`, new Date(parseInt(data.data.date)));
          }
        } else {
          console.error(`[${id}] API returned error status:`, data.status);
        }
      } catch (error) {
        console.error(`[${id}] Error fetching prices:`, error);
        
        // CORS 에러 처리
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.warn(`[${id}] CORS error detected. You may need to use a proxy server.`);
          
          // 대체 방법: 프록시 서버 사용
          try {
            const proxyUrl = `/api/bithumb-proxy`; // 백엔드 프록시 엔드포인트
            const proxyResponse = await fetch(proxyUrl);
            
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              // 프록시 데이터 처리...
            }
          } catch (proxyError) {
            console.error(`[${id}] Proxy request failed:`, proxyError);
          }
        }
      }
    };

    // 초기 가격 조회
    fetchPrices();
    
    // 2초마다 가격 업데이트 (Bithumb API 제한 고려)
    intervalId = setInterval(fetchPrices, 2000);
    
    console.log(`[${id}] Service started with polling interval`);
  };

  const disconnect = () => {
    console.log(`[${id}] Disconnecting...`);
    
    isActive = false;
    
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return { id, connect, disconnect };
};

export const bithumbService = createBithumbService();
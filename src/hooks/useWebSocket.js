import { useEffect, useState, useCallback, useRef } from 'react';
import wsService from '../services/websocket';

export const useWebSocket = (channel = '*') => {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(wsService.isConnected);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // 메시지 핸들러
    const handleMessage = (message) => {
      setData(message);
      setError(null);
    };

    // 연결 상태 핸들러
    const handleConnection = (status) => {
      if (status.type === 'connection') {
        setIsConnected(status.isConnected);
        if (!status.isConnected) {
          setError('WebSocket disconnected');
        }
      }
    };

    // 채널 구독
    unsubscribeRef.current = wsService.subscribe(channel, handleMessage);
    
    // 연결 상태 구독
    const unsubscribeConnection = wsService.subscribe('connection', handleConnection);

    // 초기 연결 상태 설정
    setIsConnected(wsService.isConnected);

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeConnection();
    };
  }, [channel]);

  const sendMessage = useCallback((message) => {
    try {
      wsService.sendMessage(message);
    } catch (err) {
      setError(err.message);
      console.error('[useWebSocket] Send error:', err);
    }
  }, []);

  const reconnect = useCallback(() => {
    wsService.reconnect();
  }, []);

  return {
    data,
    isConnected,
    error,
    sendMessage,
    reconnect
  };
};

// 특정 데이터 타입용 훅
export const useTicker = (symbol) => {
  const { data, ...rest } = useWebSocket('ticker');
  
  const tickerData = data && data.code === symbol ? data : null;
  
  return {
    ticker: tickerData,
    ...rest
  };
};

export const useOrderbook = (symbol) => {
  const { data, ...rest } = useWebSocket('orderbook');
  
  const orderbookData = data && data.code === symbol ? data : null;
  
  return {
    orderbook: orderbookData,
    ...rest
  };
};

export const useTrades = (symbol) => {
  const [trades, setTrades] = useState([]);
  const { data, ...rest } = useWebSocket('trade');
  
  useEffect(() => {
    if (data && data.code === symbol) {
      setTrades(prev => [data, ...prev].slice(0, 50)); // 최근 50개만 유지
    }
  }, [data, symbol]);
  
  return {
    trades,
    ...rest
  };
};

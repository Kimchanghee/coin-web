import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import './Dashboard.css';

const Dashboard = () => {
  const { data: tickerData, isConnected } = useWebSocket('ticker');
  const [marketData, setMarketData] = useState([]);

  useEffect(() => {
    if (tickerData) {
      setMarketData(prev => {
        const index = prev.findIndex(item => item.code === tickerData.code);
        if (index >= 0) {
          const newData = [...prev];
          newData[index] = tickerData;
          return newData;
        }
        return [...prev, tickerData].slice(0, 10); // 최대 10개
      });
    }
  }, [tickerData]);

  return (
    <div className="dashboard">
      <h2>실시간 대시보드</h2>
      
      <div className="status-card">
        <h3>연결 상태</h3>
        <p className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '✅ WebSocket 연결됨' : '❌ WebSocket 연결 끊김'}
        </p>
      </div>

      <div className="market-overview">
        <h3>시장 개요</h3>
        {marketData.length === 0 ? (
          <p>데이터를 기다리는 중...</p>
        ) : (
          <div className="market-grid">
            {marketData.map(item => (
              <div key={item.code} className="market-item">
                <h4>{item.code}</h4>
                <p className="price">{item.trade_price?.toLocaleString()} KRW</p>
                <p className={item.change === 'RISE' ? 'rise' : 'fall'}>
                  {item.change_rate ? (item.change_rate * 100).toFixed(2) : 0}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

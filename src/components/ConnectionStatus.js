import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const { isConnected, reconnect } = useWebSocket('connection');
  const [showReconnect, setShowReconnect] = useState(false);
  const [connectionTime, setConnectionTime] = useState(null);

  useEffect(() => {
    if (isConnected) {
      setConnectionTime(new Date());
      setShowReconnect(false);
    } else {
      // 3초 후 재연결 버튼 표시
      const timer = setTimeout(() => setShowReconnect(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const getConnectionDuration = () => {
    if (!connectionTime) return '';
    
    const now = new Date();
    const diff = Math.floor((now - connectionTime) / 1000);
    
    if (diff < 60) return `${diff}초`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분`;
    return `${Math.floor(diff / 3600)}시간`;
  };

  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-indicator">
        <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
        <span className="status-text">
          {isConnected ? '연결됨' : '연결 끊김'}
        </span>
        {isConnected && connectionTime && (
          <span className="connection-duration">
            ({getConnectionDuration()})
          </span>
        )}
      </div>
      
      {!isConnected && showReconnect && (
        <button 
          className="reconnect-button"
          onClick={reconnect}
        >
          재연결
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;

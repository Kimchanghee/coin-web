import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Services
import wsService from './services/websocket';

// Components
import Header from './components/Header';
import Navigation from './components/Navigation';
import ConnectionStatus from './components/ConnectionStatus';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Dashboard from './pages/Dashboard';
import Chart from './pages/Chart';
import Exchange from './pages/Exchange';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 앱 시작 시 즉시 WebSocket 연결 (구독자 없어도 연결 유지)
    console.log('[App] Initializing WebSocket connection...');
    wsService.connect();
    
    // 페이지 visibility 변경 시 재연결 처리
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!wsService.isConnected) {
          console.log('[App] Page visible, reconnecting WebSocket...');
          wsService.connect();
        }
      }
    };

    // 네트워크 상태 변경 감지
    const handleOnline = () => {
      console.log('[App] Network online, checking WebSocket connection...');
      if (!wsService.isConnected) {
        wsService.connect();
      }
    };

    const handleOffline = () => {
      console.log('[App] Network offline');
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기화 완료
    setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // 앱 종료 시 WebSocket 정리
      if (process.env.NODE_ENV === 'production') {
        wsService.disconnect();
      }
    };
  }, []);

  // 개발 환경에서 WebSocket 상태 로깅
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logInterval = setInterval(() => {
        console.log('[App] WebSocket status:', {
          isConnected: wsService.isConnected,
          subscribersCount: wsService.getTotalSubscribers(),
          bufferedMessages: wsService.messageBuffer.length
        });
      }, 30000); // 30초마다 로그

      return () => clearInterval(logInterval);
    }
  }, []);

  if (!isInitialized) {
    return <LoadingSpinner message="초기화 중..." />;
  }

  return (
    <Router>
      <div className="App">
        <Header />
        <ConnectionStatus />
        <Navigation />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chart" element={<Chart />} />
            <Route path="/exchange" element={<Exchange />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

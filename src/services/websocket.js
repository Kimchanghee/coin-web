// WebSocket 서비스 - Cloud Run 환경 대응 포함
class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.messageBuffer = [];
    this.isConnected = false;
    this.reconnectInterval = 5000;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.lastPongReceived = Date.now();
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Cloud Run 환경 감지
    this.isCloudRun = window.location.hostname.includes('run.app');
    this.usePolling = this.isCloudRun; // Cloud Run에서는 폴링 사용
    this.pollingInterval = null;
    this.pollingIntervalTime = 2000; // 2초마다 폴링
    
    // 초기 데이터 상태
    this.lastData = {
      ticker: {},
      orderbook: null,
      trades: [],
      chart: null
    };
    
    // 마켓 코드
    this.marketCodes = ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-ADA', 'KRW-SOL'];
    
    console.log(`[WebSocket Service] Initialized - Cloud Run: ${this.isCloudRun}, Polling: ${this.usePolling}`);
  }

  connect() {
    // 이전 연결 정리
    if (this.ws || this.pollingInterval) {
      this.disconnect();
    }

    // Cloud Run 환경에서는 폴링 사용
    if (this.usePolling) {
      console.log('[WebSocket Service] Using polling mode for Cloud Run environment');
      this.startPolling();
      return;
    }
    
    // WebSocket 연결 (로컬 또는 WebSocket 지원 환경)
    this.connectWebSocket();
  }

  connectWebSocket() {
    // 연결 시도 카운트
    this.connectionAttempts++;
    
    // 메시지 버퍼 초기화
    this.messageBuffer = [];
    
    console.log(`[WebSocket] Connecting... (Attempt ${this.connectionAttempts})`);
    
    // WebSocket URL
    const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.upbit.com/websocket/v1';
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        // 초기 구독 설정
        this.initializeWebSocketSubscriptions();
        
        // Heartbeat 시작
        this.startHeartbeat();
        
        // 버퍼된 메시지 처리
        this.processBufferedMessages();
        
        // 연결 상태 알림
        this.notifyConnectionStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          let data;
          
          // Blob 데이터 처리 (Upbit WebSocket)
          if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                data = JSON.parse(reader.result);
                this.handleWebSocketMessage(data);
              } catch (e) {
                console.error('[WebSocket] Failed to parse Blob data:', e);
              }
            };
            reader.readAsText(event.data);
          } else {
            // 일반 텍스트 데이터
            data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          }
        } catch (error) {
          console.error('[WebSocket] Invalid message format:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnected = false;
        
        // Cloud Run 환경이면 폴링으로 전환
        if (!this.usePolling && this.connectionAttempts > 3) {
          console.log('[WebSocket] Switching to polling mode after multiple failures');
          this.usePolling = true;
          this.startPolling();
          return;
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected (Code: ${event.code}, Reason: ${event.reason})`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyConnectionStatus(false);
        this.handleReconnect();
      };
      
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      
      // WebSocket 연결 실패 시 폴링으로 전환
      if (!this.usePolling) {
        console.log('[WebSocket] Fallback to polling due to connection error');
        this.usePolling = true;
        this.startPolling();
      }
    }
  }

  initializeWebSocketSubscriptions() {
    // Upbit WebSocket 구독 메시지
    const subscribeMessage = [
      { ticket: `coin-web-${Date.now()}` },
      { type: "ticker", codes: this.marketCodes },
      { type: "orderbook", codes: this.marketCodes.slice(0, 2) }, // BTC, ETH만
      { type: "trade", codes: this.marketCodes.slice(0, 2) }
    ];
    
    this.sendMessage(subscribeMessage);
  }

  // 폴링 방식 구현 (Cloud Run 환경)
  async startPolling() {
    console.log('[Polling] Starting polling mode');
    this.isConnected = true;
    this.notifyConnectionStatus(true);
    
    // 즉시 첫 데이터 가져오기
    await this.fetchPollingData();
    
    // 정기적으로 데이터 가져오기
    this.pollingInterval = setInterval(async () => {
      await this.fetchPollingData();
    }, this.pollingIntervalTime);
  }

  async fetchPollingData() {
    try {
      // Ticker 데이터 가져오기
      const tickerResponse = await fetch(
        `https://api.upbit.com/v1/ticker?markets=${this.marketCodes.join(',')}`
      );
      
      if (tickerResponse.ok) {
        const tickerData = await tickerResponse.json();
        
        // 각 티커 데이터를 개별적으로 처리
        tickerData.forEach(ticker => {
          const formattedData = {
            type: 'ticker',
            code: ticker.market,
            trade_price: ticker.trade_price,
            change: ticker.change,
            change_rate: ticker.change_rate,
            change_price: ticker.change_price,
            high_price: ticker.high_price,
            low_price: ticker.low_price,
            acc_trade_volume_24h: ticker.acc_trade_volume_24h,
            acc_trade_price_24h: ticker.acc_trade_price_24h,
            timestamp: ticker.timestamp || Date.now()
          };
          
          // 데이터 저장 및 구독자에게 알림
          this.lastData.ticker[ticker.market] = formattedData;
          this.handleMessage(formattedData);
        });
      }
      
      // Orderbook 데이터 (BTC, ETH만)
      const orderbookPromises = this.marketCodes.slice(0, 2).map(async (market) => {
        try {
          const response = await fetch(
            `https://api.upbit.com/v1/orderbook?markets=${market}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data[0]) {
              const orderbook = data[0];
              const formattedData = {
                type: 'orderbook',
                code: market,
                orderbook_units: orderbook.orderbook_units,
                timestamp: orderbook.timestamp || Date.now()
              };
              
              this.lastData.orderbook = formattedData;
              this.handleMessage(formattedData);
            }
          }
        } catch (error) {
          console.error(`[Polling] Error fetching orderbook for ${market}:`, error);
        }
      });
      
      await Promise.all(orderbookPromises);
      
    } catch (error) {
      console.error('[Polling] Error fetching data:', error);
      
      // 에러가 계속되면 연결 상태를 끊김으로 표시
      if (!navigator.onLine) {
        this.isConnected = false;
        this.notifyConnectionStatus(false);
      }
    }
  }

  handleWebSocketMessage(data) {
    // 메시지 유효성 검증
    if (!this.isValidMessage(data)) {
      return;
    }

    // Pong 메시지 처리
    if (data.type === 'pong') {
      this.lastPongReceived = Date.now();
      return;
    }

    // Upbit 데이터 포맷 처리
    this.handleMessage(data);
  }

  handleMessage(data) {
    // 메시지 유효성 검증
    if (!this.isValidMessage(data)) {
      console.warn('[WebSocket] Invalid or stale message received');
      return;
    }

    // 데이터 타입별 캐싱
    if (data.type === 'ticker' && data.code) {
      this.lastData.ticker[data.code] = data;
    } else if (data.type === 'orderbook') {
      this.lastData.orderbook = data;
    } else if (data.type === 'trade') {
      if (!this.lastData.trades) {
        this.lastData.trades = [];
      }
      this.lastData.trades.unshift(data);
      this.lastData.trades = this.lastData.trades.slice(0, 100); // 최근 100개만 유지
    }

    // 구독자들에게 알림
    this.notifySubscribers(data);
  }

  isValidMessage(data) {
    // 기본 유효성 검증
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 타임스탬프 검증 (있는 경우)
    if (data.timestamp) {
      const messageAge = Date.now() - data.timestamp;
      // 60초 이상 오래된 메시지는 무시
      if (messageAge > 60000) {
        return false;
      }
    }

    return true;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    // WebSocket 모드에서만 heartbeat 사용
    if (!this.usePolling && this.ws) {
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          // Ping 메시지 전송
          this.sendMessage({ type: 'ping' });
          
          // Pong 응답 체크
          const timeSinceLastPong = Date.now() - this.lastPongReceived;
          if (timeSinceLastPong > 30000) {
            console.warn('[WebSocket] No pong received for 30 seconds, reconnecting...');
            this.reconnect();
          }
        }
      }, 10000); // 10초마다 heartbeat
    }
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel).add(callback);
    
    // 구독 시작 시 마지막 데이터가 있으면 즉시 전달
    if (channel === 'ticker' && Object.keys(this.lastData.ticker).length > 0) {
      // 모든 ticker 데이터 전달
      Object.values(this.lastData.ticker).forEach(ticker => {
        callback(ticker);
      });
    } else if (this.lastData[channel]) {
      callback(this.lastData[channel]);
    }
    
    // 첫 구독자이고 연결이 없으면 연결 시작
    if (this.getTotalSubscribers() === 1 && !this.ws && !this.pollingInterval) {
      this.connect();
    }

    // Unsubscribe 함수 반환
    return () => {
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(callback);
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  getTotalSubscribers() {
    let total = 0;
    this.subscribers.forEach(subscribers => {
      total += subscribers.size;
    });
    return total;
  }

  notifySubscribers(data) {
    // 채널별 구독자에게 알림
    if (data.type && this.subscribers.has(data.type)) {
      this.subscribers.get(data.type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Subscriber error for channel ${data.type}:`, error);
        }
      });
    }

    // 전체 구독자에게 알림
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WebSocket] Global subscriber error:', error);
        }
      });
    }
  }

  notifyConnectionStatus(isConnected) {
    const statusData = {
      type: 'connection',
      isConnected,
      mode: this.usePolling ? 'polling' : 'websocket',
      timestamp: Date.now()
    };
    
    this.notifySubscribers(statusData);
  }

  sendMessage(message) {
    // 폴링 모드에서는 메시지 전송 불가
    if (this.usePolling) {
      console.log('[Polling] Message sending not supported in polling mode');
      return;
    }
    
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      this.ws.send(messageStr);
      console.log('[WebSocket] Message sent:', message);
    } else {
      // 연결되지 않은 경우 버퍼에 저장
      this.messageBuffer.push(message);
      console.log('[WebSocket] Message buffered (not connected):', message);
      
      // 연결이 없으면 연결 시도
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }
  }

  processBufferedMessages() {
    if (this.usePolling) return;
    
    console.log(`[WebSocket] Processing ${this.messageBuffer.length} buffered messages`);
    
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      this.sendMessage(message);
    }
  }

  handleReconnect() {
    // 폴링 모드에서는 재연결 불필요
    if (this.usePolling) return;
    
    // 최대 재연결 시도 횟수 체크
    if (this.connectionAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached, switching to polling');
      this.usePolling = true;
      this.startPolling();
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff
    const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.connectionAttempts), 30000);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  reconnect() {
    console.log('[WebSocket Service] Manual reconnection triggered');
    this.disconnect();
    this.connect();
  }

  disconnect() {
    console.log('[WebSocket Service] Disconnecting...');
    
    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Heartbeat 정리
    this.stopHeartbeat();

    // 폴링 정리
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // WebSocket 정리
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.connectionAttempts = 0;
  }

  // 상태 초기화
  reset() {
    this.disconnect();
    this.subscribers.clear();
    this.messageBuffer = [];
    this.lastData = {
      ticker: {},
      orderbook: null,
      trades: [],
      chart: null
    };
    this.usePolling = this.isCloudRun;
  }

  // 현재 연결 모드 확인
  getConnectionMode() {
    return this.usePolling ? 'polling' : 'websocket';
  }

  // 폴링 간격 변경
  setPollingInterval(interval) {
    this.pollingIntervalTime = Math.max(1000, interval); // 최소 1초
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.startPolling();
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
const wsService = new WebSocketService();

// 개발 환경에서 디버깅용
if (process.env.NODE_ENV === 'development') {
  window.wsService = wsService;
}

export default wsService;

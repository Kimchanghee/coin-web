// WebSocket 서비스 - 싱글톤 패턴으로 구현
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
    
    // 초기 데이터 상태
    this.lastData = {
      ticker: null,
      orderbook: null,
      trades: [],
      chart: null
    };
  }

  connect() {
    // 이전 연결 정리
    if (this.ws) {
      this.disconnect();
    }

    // 연결 시도 카운트
    this.connectionAttempts++;
    
    // 메시지 버퍼 초기화
    this.messageBuffer = [];
    
    console.log(`[WebSocket] Connecting... (Attempt ${this.connectionAttempts})`);
    
    // WebSocket URL - 실제 거래소 WebSocket URL로 변경 필요
    const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.upbit.com/websocket/v1';
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        // 초기 구독 설정
        this.initializeSubscriptions();
        
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
          
          // Blob 데이터 처리 (Upbit 등 일부 거래소)
          if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                data = JSON.parse(reader.result);
                this.handleMessage(data);
              } catch (e) {
                console.error('[WebSocket] Failed to parse Blob data:', e);
              }
            };
            reader.readAsText(event.data);
          } else {
            // 일반 텍스트 데이터
            data = JSON.parse(event.data);
            this.handleMessage(data);
          }
        } catch (error) {
          console.error('[WebSocket] Invalid message format:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnected = false;
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
      this.handleReconnect();
    }
  }

  initializeSubscriptions() {
    // Upbit 형식 예제 - 실제 사용하는 거래소에 맞게 수정
    const subscribeMessage = [
      { ticket: "unique-ticket-id" },
      { type: "ticker", codes: ["KRW-BTC", "KRW-ETH"] },
      { type: "orderbook", codes: ["KRW-BTC", "KRW-ETH"] },
      { type: "trade", codes: ["KRW-BTC", "KRW-ETH"] }
    ];
    
    this.sendMessage(subscribeMessage);
  }

  handleMessage(data) {
    // 메시지 유효성 검증
    if (!this.isValidMessage(data)) {
      console.warn('[WebSocket] Invalid or stale message received:', data);
      return;
    }

    // Pong 메시지 처리
    if (data.type === 'pong') {
      this.lastPongReceived = Date.now();
      return;
    }

    // 데이터 타입별 캐싱
    if (data.type) {
      this.lastData[data.type] = data;
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
      // 30초 이상 오래된 메시지는 무시
      if (messageAge > 30000) {
        return false;
      }
    }

    return true;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
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
    if (this.lastData[channel]) {
      callback(this.lastData[channel]);
    }
    
    // 첫 구독자이고 연결이 없으면 연결 시작
    if (this.getTotalSubscribers() === 1 && !this.ws) {
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
      timestamp: Date.now()
    };
    
    this.notifySubscribers(statusData);
  }

  sendMessage(message) {
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
    console.log(`[WebSocket] Processing ${this.messageBuffer.length} buffered messages`);
    
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      this.sendMessage(message);
    }
  }

  handleReconnect() {
    // 최대 재연결 시도 횟수 체크
    if (this.connectionAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
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
    console.log('[WebSocket] Manual reconnection triggered');
    this.disconnect();
    this.connect();
  }

  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

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
      ticker: null,
      orderbook: null,
      trades: [],
      chart: null
    };
  }
}

// 싱글톤 인스턴스 생성 및 export
const wsService = new WebSocketService();

// 개발 환경에서 디버깅용
if (process.env.NODE_ENV === 'development') {
  window.wsService = wsService;
}

export default wsService;

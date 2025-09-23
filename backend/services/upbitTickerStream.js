const WebSocket = require('ws');

const MARKET_CODES = [
  'KRW-BTC', 'KRW-ETH', 'KRW-SOL', 'KRW-XRP', 'KRW-ADA',
  'KRW-DOGE', 'KRW-MATIC', 'KRW-DOT', 'KRW-AVAX', 'KRW-SHIB',
  'KRW-TRX', 'KRW-LTC', 'KRW-BCH', 'KRW-LINK', 'KRW-UNI',
  'KRW-ATOM', 'KRW-XLM', 'KRW-ALGO', 'KRW-NEAR', 'KRW-FIL',
  'KRW-SAND', 'KRW-MANA', 'KRW-AAVE', 'KRW-GRT', 'KRW-FTM',
  'KRW-VET', 'KRW-ICP', 'KRW-HBAR', 'KRW-XTZ', 'KRW-EOS',
  'KRW-MKR', 'KRW-ENJ', 'KRW-BAT', 'KRW-ZEC', 'KRW-KAVA',
];

const EXCHANGE_ID = 'upbit_krw';
const WS_ENDPOINT = 'wss://api.upbit.com/websocket/v1';

const parseNumber = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : undefined;
};

const deriveChangePercent = ({ percent, ratio, priceChange, openPrice, lastPrice }) => {
  const open = parseNumber(openPrice);
  const last = parseNumber(lastPrice);
  if (open !== undefined && last !== undefined && open !== 0) {
    const derived = ((last - open) / open) * 100;
    if (Number.isFinite(derived)) {
      return derived;
    }
  }

  const delta = parseNumber(priceChange);
  if (delta !== undefined && open !== undefined && open !== 0) {
    const derived = (delta / open) * 100;
    if (Number.isFinite(derived)) {
      return derived;
    }
  }

  const percentValue = parseNumber(percent);
  if (percentValue !== undefined) {
    const absolute = Math.abs(percentValue);
    if (absolute <= 1) {
      return percentValue * 100;
    }
    return percentValue;
  }

  const ratioValue = parseNumber(ratio);
  if (ratioValue !== undefined) {
    const absolute = Math.abs(ratioValue);
    if (absolute <= 1) {
      return ratioValue * 100;
    }
    return ratioValue;
  }

  return undefined;
};

const deriveQuoteVolume = (quoteVolumeInput, baseVolumeInput, price) => {
  const quoteVolume = parseNumber(quoteVolumeInput);
  if (quoteVolume !== undefined && Number.isFinite(quoteVolume) && quoteVolume > 0) {
    return quoteVolume;
  }

  const baseVolume = parseNumber(baseVolumeInput);
  const parsedPrice = parseNumber(price);
  if (
    baseVolume !== undefined &&
    parsedPrice !== undefined &&
    Number.isFinite(baseVolume) &&
    Number.isFinite(parsedPrice) &&
    baseVolume > 0 &&
    parsedPrice > 0
  ) {
    return baseVolume * parsedPrice;
  }

  return undefined;
};

class UpbitTickerStream {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.connectionAttempts = 0;
    this.lastPong = Date.now();
    this.snapshot = {
      exchange: EXCHANGE_ID,
      connected: false,
      lastUpdated: null,
      tickers: {},
    };

    this.connect();
  }

  connect() {
    this.clearTimers();

    const ws = new WebSocket(WS_ENDPOINT);
    this.ws = ws;
    this.connectionAttempts += 1;

    ws.on('open', () => {
      this.connected = true;
      this.snapshot.connected = true;
      this.snapshot.connectedAt = Date.now();
      this.connectionAttempts = 0;

      const subscribeMessage = [
        { ticket: `coin-web-backend-${Date.now()}` },
        { type: 'ticker', codes: MARKET_CODES },
        { format: 'JSON' },
      ];
      ws.send(JSON.stringify(subscribeMessage));

      this.startHeartbeat();
      this.notifyStatus({ connected: true, timestamp: Date.now() });
    });

    ws.on('message', (raw) => {
      this.lastPong = Date.now();

      let payload;
      try {
        const text = typeof raw === 'string' ? raw : raw.toString('utf8');
        payload = JSON.parse(text);
      } catch (error) {
        console.error('[upbitTickerStream] Failed to parse message:', error);
        return;
      }

      if (!payload || payload.type !== 'ticker' || !payload.code) {
        return;
      }

      const now = Date.now();
      const symbol = String(payload.code).split('-')[1] || payload.code;
      const price = parseNumber(payload.trade_price);
      if (price === undefined || price <= 0) {
        return;
      }

      const change24h = deriveChangePercent({
        percent: payload.signed_change_rate,
        ratio: payload.signed_change_rate,
        priceChange: payload.signed_change_price,
        openPrice: payload.prev_closing_price,
        lastPrice: price,
      });

      const volume24h = deriveQuoteVolume(
        payload.acc_trade_price_24h,
        payload.acc_trade_volume_24h,
        price
      );

      const update = {
        exchange: EXCHANGE_ID,
        market: payload.code,
        symbol,
        priceKey: `${EXCHANGE_ID}-${symbol}`,
        price,
        change24h,
        volume24h,
        changePrice: parseNumber(payload.signed_change_price),
        timestamp: now,
      };

      this.snapshot.lastUpdated = now;
      this.snapshot.tickers[update.priceKey] = update;
      this.notify(update);
    });

    ws.on('close', (code, reason) => {
      console.warn(`[upbitTickerStream] Connection closed (${code}): ${reason}`);
      this.connected = false;
      this.snapshot.connected = false;
      this.notifyStatus({ connected: false, timestamp: Date.now(), code, reason });
      this.scheduleReconnect();
    });

    ws.on('error', (error) => {
      console.error('[upbitTickerStream] WebSocket error:', error);
    });
  }

  startHeartbeat() {
    this.clearHeartbeat();
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const now = Date.now();
      if (now - this.lastPong > 60000) {
        console.warn('[upbitTickerStream] No data for 60s, reconnecting...');
        this.ws.terminate();
        return;
      }

      try {
        this.ws.send('PING');
      } catch (error) {
        console.error('[upbitTickerStream] Failed to send ping:', error);
      }
    }, 30000);
  }

  clearHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHeartbeat();
  }

  scheduleReconnect() {
    this.clearTimers();

    const attempt = Math.min(this.connectionAttempts, 10);
    const delay = Math.min(30000, 2000 * Math.pow(1.5, attempt));

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  notify(update) {
    this.listeners.forEach((listener) => {
      try {
        listener(update);
      } catch (error) {
        console.error('[upbitTickerStream] Listener failure:', error);
      }
    });
  }

  notifyStatus(status) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[upbitTickerStream] Status listener failure:', error);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getSnapshot() {
    return {
      ...this.snapshot,
      tickers: { ...this.snapshot.tickers },
    };
  }
}

module.exports = new UpbitTickerStream();

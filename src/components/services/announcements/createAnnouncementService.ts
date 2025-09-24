import type { Announcement, AnnouncementCallback, AnnouncementService, ExchangeId } from '../../../types';

const STREAM_PATH = '/api/announcements-stream';
const FALLBACK_LIMIT = 20;
const STREAM_TIMEOUT_MS = 2500;
const RECONNECT_DELAY_MS = 5000;
const FALLBACK_DELAY_MS = 30;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const resolveWebSocketUrl = (exchangeId: ExchangeId): string | null => {
  const globalOverride =
    typeof window !== 'undefined'
      ? (window as any).__ANNOUNCEMENTS_WS_URL__ ?? (window as any).__ANNOUNCEMENTS_WS_PATH__
      : undefined;
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
  const envOverride =
    env.REACT_APP_ANNOUNCEMENTS_WS_URL ||
    env.REACT_APP_ANNOUNCEMENTS_WS_PATH ||
    env.VITE_ANNOUNCEMENTS_WS_URL ||
    env.VITE_ANNOUNCEMENTS_WS_PATH;

  if (globalOverride) {
    const hasQuery = String(globalOverride).includes('?');
    return `${globalOverride}${hasQuery ? '&' : '?'}exchange=${exchangeId}`;
  }

  if (envOverride) {
    const hasQuery = String(envOverride).includes('?');
    return `${envOverride}${hasQuery ? '&' : '?'}exchange=${exchangeId}`;
  }

  if (typeof window === 'undefined' || !window.location) {
    return null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${STREAM_PATH}?exchange=${exchangeId}`;
};

const createAnnouncementService = (exchangeId: ExchangeId): AnnouncementService => {
  let socket: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let manualClose = false;

  const cleanupSocket = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      manualClose = true;
      socket.onclose = null;
      socket.onerror = null;
      socket.close(1000, 'Announcement service cleanup');
    }

    socket = null;
  };

  const connect = (callback: AnnouncementCallback) => {
    let isActive = true;
    let hasReceivedStreamData = false;
    let fallbackTriggered = false;
    manualClose = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const deliver = (announcement: Announcement) => {
      if (!isActive) return;
      callback({ exchangeId, announcement });
    };

    const fallbackFetch = async () => {
      if (fallbackTriggered || !isActive) {
        return;
      }

      fallbackTriggered = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        manualClose = true;
        try {
          socket.close(4000, 'Fallback to HTTP announcements');
        } catch (error) {
          console.error(`[${exchangeId}] Failed to close WebSocket during fallback:`, error);
        }
      }

      socket = null;

      try {
        const response = await fetch(`/api/announcements/${exchangeId}.json`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Announcement[] = await response.json();
        const sorted = data
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, FALLBACK_LIMIT);

        for (const announcement of sorted) {
          if (!isActive) break;
          deliver(announcement);
          await delay(FALLBACK_DELAY_MS);
        }
      } catch (error) {
        console.error(`[${exchangeId}] Failed to fetch announcements via HTTP fallback:`, error);
      }
    };

    const attachSocketListeners = (ws: WebSocket, url: string) => {
      console.log(`[${exchangeId}] Connecting announcement WebSocket: ${url}`);

      ws.onopen = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        timeoutHandle = setTimeout(() => {
          if (!hasReceivedStreamData && !fallbackTriggered) {
            console.warn(`[${exchangeId}] Announcement WebSocket timed out without data. Falling back to HTTP.`);
            fallbackFetch();
          }
        }, STREAM_TIMEOUT_MS);
      };

      ws.onmessage = (event) => {
        if (!isActive) return;

        try {
          const payload = JSON.parse(event.data);

          if (payload?.type === 'heartbeat') {
            return;
          }

          const announcement: Announcement | undefined = payload?.announcement;
          if (announcement) {
            hasReceivedStreamData = true;
            fallbackTriggered = true;

            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = null;
            }

            deliver(announcement);
          }
        } catch (error) {
          console.error(`[${exchangeId}] Failed to parse announcement WebSocket message:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`[${exchangeId}] Announcement WebSocket error:`, error);
        if (!hasReceivedStreamData && !fallbackTriggered) {
          fallbackFetch();
        }
      };

      ws.onclose = (event) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        socket = null;

        if (manualClose) {
          manualClose = false;
          return;
        }

        if (!isActive) {
          return;
        }

        if (hasReceivedStreamData) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connectWebSocket();
          }, RECONNECT_DELAY_MS);
        } else if (!fallbackTriggered) {
          fallbackFetch();
        }
      };
    };

    const connectWebSocket = () => {
      if (!isActive) {
        return;
      }

      const url = resolveWebSocketUrl(exchangeId);
      if (!url) {
        console.warn(`[${exchangeId}] Announcement WebSocket URL could not be resolved. Falling back to HTTP.`);
        fallbackFetch();
        return;
      }

      try {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          manualClose = true;
          socket.close(4001, 'Reconnect announcement WebSocket');
        }

        socket = new WebSocket(url);
        attachSocketListeners(socket, url);
      } catch (error) {
        console.error(`[${exchangeId}] Failed to initialise announcement WebSocket:`, error);
        fallbackFetch();
      }
    };

    connectWebSocket();

    return () => {
      isActive = false;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        manualClose = true;
        socket.close(1000, 'Announcement service disconnect');
      }

      socket = null;
    };
  };

  const disconnect = () => {
    cleanupSocket();
  };

  return { id: exchangeId, connect, disconnect };
};

export default createAnnouncementService;

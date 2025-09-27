/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const fsPromises = fs.promises;
const axios = require('axios');
const https = require('https');
const path = require('path');
const WebSocket = require('ws');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');

const app = express();
const HOST = '0.0.0.0';
const port = process.env.PORT || 8080; // Cloud Run의 PORT 사용
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
// Support either API key env-var variant
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

// ⚠️ dist는 프로젝트 루트에 생성되므로 server 기준으로 한 단계 위를 바라봐야 함
const staticCandidates = ['dist', 'build'];
const staticPath = staticCandidates
  .map(dir => path.resolve(__dirname, '..', dir))
  .find(fs.existsSync) || path.resolve(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, 'public');
const ANNOUNCEMENTS_DIR = path.resolve(__dirname, '..', 'api', 'announcements');
const ANNOUNCEMENT_ID_REGEX = /^[a-z0-9_-]+$/i;

if (!apiKey) {
  // 프록시 없이도 정적 파일은 서빙 가능하므로 종료하지 않음
  console.error("Warning: GEMINI_API_KEY or API_KEY environment variable is not set! Proxy functionality will be disabled.");
} else {
  console.log("API KEY FOUND (proxy will use this)");
}

// Body limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('trust proxy', 1);

// Rate limiter for the proxy
const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Health checks (Cloud Run)
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }));

// Apply the rate limiter to the /api-proxy route
app.use('/api-proxy', proxyLimiter);

// Proxy route for Gemini API calls (HTTP)
app.use('/api-proxy', async (req, res, next) => {
  // For WS upgrade requests, pass through
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return next();
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // tighten if needed
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Api-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }

  try {
    const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
    console.log(`HTTP Proxy -> ${apiUrl}`);

    const outgoingHeaders = {};
    for (const header in req.headers) {
      if (!['host','connection','content-length','transfer-encoding','upgrade','sec-websocket-key','sec-websocket-version','sec-websocket-extensions'].includes(header.toLowerCase())) {
        outgoingHeaders[header] = req.headers[header];
      }
    }
    outgoingHeaders['X-Goog-Api-Key'] = apiKey;
    if (req.headers['content-type'] && ['POST','PUT','PATCH'].includes(req.method.toUpperCase())) {
      outgoingHeaders['Content-Type'] = req.headers['content-type'];
    } else if (['POST','PUT','PATCH'].includes(req.method.toUpperCase())) {
      outgoingHeaders['Content-Type'] = 'application/json';
    }
    if (['GET','DELETE'].includes(req.method.toUpperCase())) {
      delete outgoingHeaders['Content-Type'];
      delete outgoingHeaders['content-type'];
    }
    if (!outgoingHeaders['accept']) outgoingHeaders['accept'] = '*/*';

    const axiosConfig = {
      method: req.method,
      url: apiUrl,
      headers: outgoingHeaders,
      responseType: 'stream',
      validateStatus: () => true
    };
    if (['POST','PUT','PATCH'].includes(req.method.toUpperCase())) {
      axiosConfig.data = req.body;
    }

    const apiResponse = await axios(axiosConfig);

    for (const header in apiResponse.headers) {
      res.setHeader(header, apiResponse.headers[header]);
    }
    res.status(apiResponse.status);
    apiResponse.data.on('data', chunk => res.write(chunk));
    apiResponse.data.on('end', () => res.end());
    apiResponse.data.on('error', err => {
      console.error('Proxy stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Proxy error during streaming from target' });
      else res.end();
    });
  } catch (error) {
    console.error('Proxy error:', error);
    if (!res.headersSent) {
      if (error.response) {
        res.status(error.response.status).json({
          status: error.response.status,
          message: error.response.data?.error?.message || 'Proxy error from upstream API',
          details: error.response.data?.error?.details || null
        });
      } else {
        res.status(500).json({ error: 'Proxy setup error', message: error.message });
      }
    }
  }
});

const webSocketInterceptorScriptTag = `<script src="/public/websocket-interceptor.js" defer></script>`;
const serviceWorkerRegistrationScript = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load' , () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}
</script>
`;

// Serve index.html or placeholder
app.get('/', (_req, res) => {
  const placeholderPath = path.join(publicPath, 'placeholder.html');
  const indexPath = path.join(staticPath, 'index.html');

  fs.readFile(indexPath, 'utf8', (err, indexHtmlData) => {
    if (err) {
      console.log('index.html not found. Serving placeholder.');
      return res.sendFile(placeholderPath);
    }
    if (!apiKey) {
      console.log('API key not set. Serving original index.html.');
      return res.sendFile(indexPath);
    }
    let injectedHtml = indexHtmlData;
    if (injectedHtml.includes('<head>')) {
      injectedHtml = injectedHtml.replace('<head>', `<head>${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}`);
    } else {
      injectedHtml = `${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}${indexHtmlData}`;
    }
    res.send(injectedHtml);
  });
});

app.get('/service-worker.js', (_req, res) => {
  return res.sendFile(path.join(publicPath, 'service-worker.js'));
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

// Start HTTP server
const server = app.listen(port, HOST, () => {
  console.log(`Server listening on http://${HOST}:${port}`);
  console.log(`HTTP proxy active on /api-proxy/**`);
  console.log(`WebSocket proxy active on /api-proxy/**`);
});

// WebSocket proxy
const wss = new WebSocket.Server({ noServer: true });
const announcementsWss = new WebSocket.Server({ noServer: true });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const streamAnnouncements = async (clientWs, exchangeId) => {
  try {
    const filePath = path.join(ANNOUNCEMENTS_DIR, `${exchangeId}.json`);

    try {
      await fsPromises.access(filePath);
    } catch (_error) {
      throw new Error(`Announcements file not found for ${exchangeId}`);
    }

    const raw = await fsPromises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid announcements payload for ${exchangeId}`);
    }

    const sorted = parsed
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    for (const announcement of sorted) {
      if (clientWs.readyState !== WebSocket.OPEN) {
        return;
      }

      clientWs.send(JSON.stringify({
        type: 'announcement',
        exchangeId,
        announcement
      }));

      await delay(40);
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'end', exchangeId }));
    }
  } catch (error) {
    console.error(`Announcement stream error for ${exchangeId}:`, error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        exchangeId,
        message: 'Failed to load announcements'
      }));
    }
  }
};

announcementsWss.on('connection', (clientWs, _request, clientInfo = {}) => {
  const exchangeId = clientInfo.exchangeId;

  if (!exchangeId || !ANNOUNCEMENT_ID_REGEX.test(exchangeId)) {
    clientWs.close(1008, 'Invalid exchange parameter');
    return;
  }

  console.log(`Announcement WS client connected for ${exchangeId}`);

  streamAnnouncements(clientWs, exchangeId);

  const heartbeat = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'heartbeat',
        exchangeId,
        timestamp: Date.now()
      }));
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  clientWs.on('close', (code, reason) => {
    clearInterval(heartbeat);
    console.log(`Announcement WS for ${exchangeId} closed: ${code} ${reason}`);
  });

  clientWs.on('error', (error) => {
    console.error(`Announcement WS error for ${exchangeId}:`, error);
    clearInterval(heartbeat);
  });
});

server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname;

  if (pathname.startsWith('/api-proxy/')) {
    if (!apiKey) {
      console.error("WebSocket proxy: API key not configured. Closing connection.");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientWs) => {
      console.log('Client WS connected to proxy:', pathname);

      const targetPathSegment = pathname.substring('/api-proxy'.length);
      const clientQuery = new URLSearchParams(requestUrl.search);
      clientQuery.set('key', apiKey);
      const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;
      console.log(`Connecting upstream WS: ${targetGeminiWsUrl}`);

      const geminiWs = new WebSocket(targetGeminiWsUrl, {
        protocol: request.headers['sec-websocket-protocol'],
      });

      const messageQueue = [];

      geminiWs.on('open', () => {
        console.log('Upstream Gemini WS connected');
        while (messageQueue.length > 0 && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(messageQueue.shift());
        }
      });

      geminiWs.on('message', (message) => {
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(message);
      });

      geminiWs.on('close', (code, reason) => {
        console.log(`Upstream WS closed: ${code} ${reason.toString()}`);
        if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
          clientWs.close(code, reason.toString());
        }
      });

      geminiWs.on('error', (error) => {
        console.error('Upstream WS error:', error);
        if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
          clientWs.close(1011, 'Upstream WebSocket error');
        }
      });

      clientWs.on('message', (message) => {
        if (geminiWs.readyState === WebSocket.OPEN) geminiWs.send(message);
        else if (geminiWs.readyState === WebSocket.CONNECTING) messageQueue.push(message);
      });

      clientWs.on('close', (code, reason) => {
        console.log(`Client WS closed: ${code} ${reason.toString()}`);
        if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
          geminiWs.close(code, reason.toString());
        }
      });

      clientWs.on('error', (error) => {
        console.error('Client WS error:', error);
        if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
          geminiWs.close(1011, 'Client WebSocket error');
        }
      });
    });
    return;
  }

  if (pathname.startsWith('/api/announcements-stream')) {
    const exchangeId = requestUrl.searchParams.get('exchange');
    if (!exchangeId || !ANNOUNCEMENT_ID_REGEX.test(exchangeId)) {
      console.warn(`Invalid announcements stream request: ${request.url}`);
      socket.destroy();
      return;
    }

    announcementsWss.handleUpgrade(request, socket, head, (clientWs) => {
      announcementsWss.emit('connection', clientWs, request, { exchangeId });
    });
    return;
  }

  console.log(`WS upgrade for unsupported path: ${pathname}. Closing.`);
  socket.destroy();
});

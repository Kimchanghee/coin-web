// backend/server.js

const path = require('path');

const fs = require('fs');

const express = require('express');

const axios = require('axios');

const cors = require('cors');

const upbitTickerStream = require('./services/upbitTickerStream');

const app = express();

const PORT = process.env.PORT || 8080;

const HOST = '0.0.0.0';

// 공통 미들웨어

app.use(cors());

app.use(express.json());

// --- (A) 헬스체크 ---

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }));

// --- (B) 프록시 라우트 (필요시 추가/수정) ---

app.get('/api/proxy/bithumb', async (_req, res) => {

try {

const resp = await axios.get('https://api.bithumb.com/public/ticker/ALL_KRW', { timeout: 8000 });

 res.json(resp.data);

 } catch (err) {

console.error('Bithumb proxy error:', err.message);

 res.status(500).json({ error: 'Failed to fetch Bithumb data' });

 }

});

app.get('/api/proxy/coinone', async (_req, res) => {

@@ -43,44 +44,75 @@ app.get('/api/proxy/bitget/spot/:symbol', async (req, res) => {

const resp = await axios.get(

https://api.bitget.com/api/spot/v1/market/ticker?symbol=${encodeURIComponent(symbol)}_SPBL,

 { timeout: 8000 }

 );

 res.json(resp.data);

 } catch (err) {

console.error('Bitget spot proxy error:', err.message);

 res.status(500).json({ error: 'Failed to fetch Bitget data' });

 }

});

app.get('/api/proxy/bitget/futures/:symbol', async (req, res) => {

try {

const { symbol } = req.params;

const resp = await axios.get(

https://api.bitget.com/api/mix/v1/market/ticker?symbol=${encodeURIComponent(symbol)}_UMCBL,

 { timeout: 8000 }

 );

 res.json(resp.data);

 } catch (err) {

console.error('Bitget futures proxy error:', err.message);

 res.status(500).json({ error: 'Failed to fetch Bitget data' });

 }

});

// --- (C) 실시간 시세 캐시 및 SSE 스트림 ---

app.get('/api/market/upbit/snapshot', (_req, res) => {

 res.json(upbitTickerStream.getSnapshot());

});

app.get('/api/market/upbit/stream', (req, res) => {

 res.setHeader('Content-Type', 'text/event-stream');

 res.setHeader('Cache-Control', 'no-cache');

 res.setHeader('Connection', 'keep-alive');

const sendEvent = (event, data) => {

 res.write(`event: ${event}\n`);

 res.write(`data: ${JSON.stringify(data)}\n\n`);

 };

sendEvent('snapshot', upbitTickerStream.getSnapshot());

const unsubscribeTicker = upbitTickerStream.subscribe((update) => {

sendEvent('ticker', update);

 });

const unsubscribeStatus = upbitTickerStream.subscribeStatus((status) => {

sendEvent('status', status);

 });

 req.on('close', () => {

unsubscribeTicker();

unsubscribeStatus();

 });

});

// --- (D) 정적 파일 서빙 + SPA Fallback ---

const staticCandidates = ['dist', 'build'];
const staticRoot = staticCandidates
  .map(dir => path.resolve(__dirname, '..', dir))
  .find(fs.existsSync) || path.resolve(__dirname, '..', 'dist');
const distPath = staticRoot;

app.use(express.static(distPath));

app.get('*', (_req, res) => {

 res.sendFile(path.join(distPath, 'index.html'));

});

// --- (E) 에러 핸들링 (프로세스 보호) ---

process.on('unhandledRejection', (err) => {

console.error('Unhandled Rejection:', err);

});

process.on('uncaughtException', (err) => {

console.error('Uncaught Exception:', err);

});

// --- (F) 서버 시작 ---

app.listen(PORT, HOST, () => {

console.log(`Server listening on http://${HOST}:${PORT}`);

});

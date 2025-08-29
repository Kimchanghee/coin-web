// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Bithumb 프록시
app.get('/api/proxy/bithumb', async (req, res) => {
  try {
    const response = await axios.get('https://api.bithumb.com/public/ticker/ALL_KRW');
    res.json(response.data);
  } catch (error) {
    console.error('Bithumb proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch Bithumb data' });
  }
});

// Coinone 프록시
app.get('/api/proxy/coinone', async (req, res) => {
  try {
    const response = await axios.get('https://api.coinone.co.kr/ticker?currency=all');
    res.json(response.data);
  } catch (error) {
    console.error('Coinone proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch Coinone data' });
  }
});

// Bitget Spot 프록시
app.get('/api/proxy/bitget/spot/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(
      `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${symbol}_SPBL`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Bitget spot proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch Bitget data' });
  }
});

// Bitget Futures 프록시
app.get('/api/proxy/bitget/futures/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(
      `https://api.bitget.com/api/mix/v1/market/ticker?symbol=${symbol}_UMCBL`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Bitget futures proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch Bitget data' });
  }
});

// Upbit 공지사항 프록시 (예시)
app.get('/api/upbit-announcements', async (req, res) => {
  try {
    // Upbit은 공식 API가 없으므로 웹 스크래핑이 필요할 수 있음
    // 여기서는 예시로 작성
    const announcements = [
      {
        id: 1,
        title: 'FRIEND 원화마켓 추가',
        url: 'https://upbit.com/notice/1',
        created_at: new Date().toISOString(),
        type: '상장'
      }
    ];
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Upbit announcements proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Vite 개발 서버와 함께 실행하기 위한 포트 설정
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

// package.json에 추가할 의존성:
// "dependencies": {
//   "express": "^4.18.2",
//   "axios": "^1.6.0",
//   "cors": "^2.8.5"
// }

// vite.config.ts에 프록시 설정 추가:
// export default defineConfig({
//   server: {
//     proxy: {
//       '/api/proxy': {
//         target: 'http://localhost:3001',
//         changeOrigin: true
//       }
//     }
//   }
// });
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          // Bithumb API 프록시 (CORS 우회)
          '/api/bithumb': {
            target: 'https://api.bithumb.com/public',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/bithumb/, ''),
            secure: false,
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                // User-Agent 헤더 추가 (일부 API에서 요구)
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                proxyReq.setHeader('Accept', 'application/json');
              });
            }
          },
          // Coinone API 프록시 (CORS 우회)
          '/api/coinone': {
            target: 'https://api.coinone.co.kr',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/coinone/, ''),
            secure: false,
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                proxyReq.setHeader('Accept', 'application/json');
              });
            }
          },
          // Bitget API 프록시 (필요시)
          '/api/bitget': {
            target: 'https://api.bitget.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/bitget/, '/api'),
            secure: false
          }
        }
      }
    };
});
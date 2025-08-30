import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: __dirname is not available in ES modules. Using import.meta.url to get the directory path.
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
        }
      },
      server: {
        proxy: {
          // Bithumb API 프록시 - 경로 수정
          '/api/bithumb/ticker/ALL_KRW': {
            target: 'https://api.bithumb.com',
            changeOrigin: true,
            rewrite: (path) => '/public/ticker/ALL_KRW',
            secure: false,
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                proxyReq.setHeader('Accept', 'application/json');
                proxyReq.setHeader('Origin', 'https://www.bithumb.com');
                proxyReq.setHeader('Referer', 'https://www.bithumb.com/');
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                // CORS 헤더 추가
                proxyRes.headers['access-control-allow-origin'] = '*';
              });
            }
          },
          // Coinone API 프록시 - 경로 수정
          '/api/coinone/ticker': {
            target: 'https://api.coinone.co.kr',
            changeOrigin: true,
            rewrite: (path) => '/ticker?currency=all',
            secure: false,
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                proxyReq.setHeader('Accept', 'application/json');
                proxyReq.setHeader('Origin', 'https://coinone.co.kr');
                proxyReq.setHeader('Referer', 'https://coinone.co.kr/');
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                // CORS 헤더 추가
                proxyRes.headers['access-control-allow-origin'] = '*';
              });
            }
          }
        }
      }
    };
});

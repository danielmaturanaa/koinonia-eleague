import { defineConfig } from 'vite';

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:5175';

export default defineConfig({
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
});

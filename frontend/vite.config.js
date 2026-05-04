import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Required for SSE (Server-Sent Events) to work — disables buffering
        // so chunks are forwarded to the browser immediately
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Force no buffering for SSE endpoints
            if (req.url?.includes('regenerate-stream')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
              proxyReq.setHeader('Cache-Control', 'no-cache');
            }
          });
        },
      },
    },
  },
});

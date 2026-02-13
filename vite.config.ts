import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env['VITE_API_PORT'] ?? '3001'}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://localhost:${process.env['VITE_API_PORT'] ?? '3001'}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/frontend',
    sourcemap: true,
  },
});

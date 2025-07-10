import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    Buffer: Buffer,
    process: {
      env: {
        GOOGLE_SDK_NODE_LOGGING: false,
      },
      stdout: {},
      stderr: {},
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
    },
  },
});

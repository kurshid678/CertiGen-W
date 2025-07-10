import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    Buffer: Buffer,
    'process.env': JSON.stringify({
      GOOGLE_SDK_NODE_LOGGING: false,
    }),
    'process.stdout': JSON.stringify({}),
    'process.stderr': JSON.stringify({}),
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

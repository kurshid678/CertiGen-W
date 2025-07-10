import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {},
    'process.stdout': {},
    'process.stderr': {},
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

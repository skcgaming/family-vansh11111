
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '', // Essential for Capacitor/Cordova relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});

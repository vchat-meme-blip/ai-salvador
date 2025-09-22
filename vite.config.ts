
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

// Fix: Cannot find name '__dirname'.
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    allowedHosts: ['ai-salvador.netlify.app', 'localhost', '127.0.0.1'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Permissions-Policy': 'autoplay=(self), microphone=()',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    // Ensure assets are served from the correct path
    proxy: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  // Configure how chunks are split
  build: {
    // Ensure audio files are properly handled
    assetsInlineLimit: 4096, // 4kb
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      // Ensure assets are output to the correct directory
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  publicDir: 'public',
});
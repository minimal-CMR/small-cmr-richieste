import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'richieste_module',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/pages/Dashboard.vue',
        './Approvazioni': './src/pages/Approvazioni.vue',
      },
      shared: ['vue', 'axios'],
    }),
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:8003', changeOrigin: true },
    },
  },
  preview: {
    port: 5175,
    strictPort: true,
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});

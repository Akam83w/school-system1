import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path'; // أضف هذا السطر في الأعلى

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.svg", "robots.txt"],
      devOptions: { enabled: false },
      manifest: {
        name: "نظام إدارة المدرسة",
        short_name: "مدرستي",
        description: "المنظومة التعليمية العراقية",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#1d4ed8",
        lang: "ar",
        dir: "rtl",
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

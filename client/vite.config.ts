import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true, // Allow all hosts for easier network access
    hmr: {
      clientPort: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
    cors: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*$/],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
          {
            urlPattern: /\.(?:js|css|html|svg|png|jpg|jpeg|woff2)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'], 
      manifest: {
        name: 'JANDALISYS',
        short_name: 'JANDALISYS',
        description: 'Export & Import Contract Management System',
        theme_color: '#0F4C81',
        background_color: '#F3F4F6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/android/android-launchericon-192-192.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
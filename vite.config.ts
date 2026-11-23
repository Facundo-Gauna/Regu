import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' y rutas con hash: la app se puede servir desde cualquier subcarpeta (hosting estático).
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      // 'prompt': el usuario decide cuándo actualizar. Un service worker viejo fijaría datos de plan desactualizados.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Regu',
        short_name: 'Regu',
        description: 'Tu cursada en la UTN FRVM, en un solo lugar. Proyecto independiente, no oficial.',
        lang: 'es-AR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1a1a',
        theme_color: '#1a1a1a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2022' },
});

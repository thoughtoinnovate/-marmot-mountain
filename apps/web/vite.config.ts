import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/marmot.svg'],
      manifest: {
        name: 'Marmot Mountain',
        short_name: 'Marmots',
        description: 'Catch playful marmots across a sunny alpine meadow.',
        theme_color: '#183d35',
        background_color: '#9ed9f2',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: './icons/marmot.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})

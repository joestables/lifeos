import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    // The design-system page ships in development and preview builds only.
    __DESIGN_PAGE__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
    // Which build an ops.events report came from.
    __APP_VERSION__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7)),
  },
  plugins: [
    // The router plugin must come before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // LifeOS's own worker: offline files and notifications (ADR-0044).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'LifeOS',
        short_name: 'LifeOS',
        start_url: '/',
        display: 'standalone',
        // Android's share sheet offers LifeOS, opening /share (RCP-003, ADR-0055).
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        // The manifest needs hex: --background (dark) from theme.css.
        background_color: '#101012',
        theme_color: '#101012',
        // The app icon (patterns.md#the-app-icon): rounded for "any", full
        // bleed for the shapes Android masks it to.
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // The body map's layers (ADR-0060) too, so it works offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
        // Only the Latin fonts are kept offline; other scripts load when needed.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese,symbols2}-*.woff2'],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})

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
        // Nor the design-system pages, which a production build never shows.
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,vietnamese,symbols2}-*.woff2',
          '**/design-*.js',
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      // The shared components are one barrel (src/components/lifeos): without
      // this, a page that uses one of them is sent all of them.
      output: {
        // Libraries in files of their own, whose names change only when the
        // library does: a deploy then sends a device the app's own code, not
        // React and Supabase again.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\//, priority: 3 },
            { name: 'supabase', test: /node_modules\/(@supabase|iceberg-js)\//, priority: 3 },
            { name: 'tanstack', test: /node_modules\/@tanstack\//, priority: 3 },
            {
              name: 'editor',
              test: /node_modules\/(@tiptap|prosemirror-[^/]+|marked)\//,
              priority: 3,
            },
            { name: 'base-ui', test: /node_modules\/(@base-ui|@floating-ui)\//, priority: 3 },
            { name: 'icons', test: /node_modules\/lucide-react\//, priority: 3 },
            // What most pages share, as one file rather than a hundred small
            // ones; a part only a few pages use (the body map, the Gym's
            // charts, a Recipe's editor) stays with those pages.
            {
              name: 'shared',
              test: /\/src\/(components|lib|hooks)\/|\/packages\/[^/]+\/src\//,
              minShareCount: 8,
              priority: 1,
            },
          ],
        },
      },
      treeshake: {
        moduleSideEffects: [
          { test: /\/src\/components\//, sideEffects: false },
          { external: true, sideEffects: true },
        ],
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})

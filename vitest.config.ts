import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: [
        'src/**/*.test.{ts,tsx}',
        'packages/**/*.test.ts',
        'supabase/functions/**/*.test.ts',
      ],
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
)

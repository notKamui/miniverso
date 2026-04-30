import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'
import { buildServeEntrypoint } from './build/vite-plugins/build-serve-entrypoint.ts'
import fmt from './oxfmt.config.ts'
import lint from './oxlint.config.ts'
import pkg from './package.json' with { type: 'json' }

function chunkNodeModules(id: string) {
  if (!id.includes('node_modules')) return undefined
  const match = /.*node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id)
  return match !== null && match.length > 0 ? match[1] : 'vendor'
}

export default defineConfig({
  fmt,
  lint,
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    buildServeEntrypoint(),
  ],
  define: { APP_VERSION: JSON.stringify(pkg.version) },
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    env: {
      TZ: 'UTC',
      NODE_ENV: 'test',
      BASE_URL: 'http://localhost',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-secret',
      RESEND_API_KEY: 'test-resend-key',
      RESEND_MAIL_DOMAIN: 'example.com',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: { output: { manualChunks: chunkNodeModules } },
  },
  staged: { '*': 'vp check --fix' },
  server: { port: 3000 },
  run: {
    cache: {
      scripts: true,
    },
  },
})

declare global {
  const APP_VERSION: string
}

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import pkg from './package.json'

const manualChunks = {
  'vendor-react': ['react/', 'react-dom/', 'scheduler'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-router': ['@tanstack/react-router'],
  'vendor-table': ['@tanstack/react-table'],
  'vendor-form': ['@tanstack/react-form'],
  'vendor-tanstack': ['@tanstack'],
  'vendor-charts': ['recharts', 'victory', 'd3-'],
  'vendor-motion': ['motion', 'framer-motion'],
  'vendor-auth': ['better-auth', '@better-auth'],
  'vendor-icons': ['lucide-react'],
  'vendor-zod': ['zod'],
  'vendor-db': ['drizzle', 'kysely', 'sqlite'],
  'vendor-radix': ['@radix-ui'],
  'vendor-date': ['date-fns', 'react-day-picker'],
} as const

const config = defineConfig({
  plugins: [
    devtools(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            for (const [chunkName, identifiers] of Object.entries(
              manualChunks,
            )) {
              if (identifiers.some((identifier) => id.includes(identifier))) {
                return chunkName
              }
            }
            return 'vendor'
          }
        },
      },
    },
  },
})

export default config

declare global {
  const APP_VERSION: string
}

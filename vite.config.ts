import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json'

const config = defineConfig({
  plugins: [devtools(), tailwindcss(), tanstackStart(), react()],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const match = /.*node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id)
            return match !== null && match.length > 0 ? match[1] : 'vendor'
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

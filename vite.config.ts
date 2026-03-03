import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json'

function chunkNodeModules(id: string) {
  if (!id.includes('node_modules')) return undefined
  const match = /.*node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id)
  return match !== null && match.length > 0 ? match[1] : 'vendor'
}

export default defineConfig({
  plugins: [devtools(), tailwindcss(), tanstackStart(), react()],
  define: { APP_VERSION: JSON.stringify(pkg.version) },
  resolve: { tsconfigPaths: true },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: { output: { manualChunks: chunkNodeModules } },
  },
})

declare global {
  const APP_VERSION: string
}

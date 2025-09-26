import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import pkg from './package.json'
import { bundleBunServer } from './plugins/bundleBunServer'

const config = defineConfig(async ({ mode }) => {
  process.env = {
    ...process.env,
    ...import.meta.env,
    ...loadEnv(mode, process.cwd(), ''),
  }

  await import('./src/lib/env/server')
  await import('./src/lib/env/client')

  return {
    optimizeDeps: {
      exclude: ['.vite'],
    },
    plugins: [
      devtools(),
      viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackStart(),
      react(),
      bundleBunServer(),
    ],
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
  }
})

export default config

declare global {
  const APP_VERSION: string
}

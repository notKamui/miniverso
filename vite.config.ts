import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, loadEnv } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig(async ({ mode }) => {
  process.env = {
    ...process.env,
    ...import.meta.env,
    ...loadEnv(mode, process.cwd(), ''),
  }
  await import('./src/lib/env/server')
  await import('./src/lib/env/client')

  return {
    plugins: [
      viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackStart(),
    ],
  }
})

export default config

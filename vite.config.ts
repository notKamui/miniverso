import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, loadEnv } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import pkg from './package.json'

const config = defineConfig(async ({ mode }) => {
  const injectedEnv = {
    VITE_APP_VERSION: pkg.version,
  } as const as NodeJS.ProcessEnv

  process.env = {
    ...process.env,
    ...import.meta.env,
    ...loadEnv(mode, process.cwd(), ''),
    ...injectedEnv,
  }

  await import('./src/lib/env/server')
  await import('./src/lib/env/client')

  return {
    plugins: [
      viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackStart({
        target: 'bun',
      }),
    ],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
  }
})

export default config

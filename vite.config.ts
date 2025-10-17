import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import pkg from './package.json'

const config = defineConfig({
  plugins: [
    devtools(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      sitemap: {
        enabled: true,
        host: 'https://mini.notkamui.com',
      },
      prerender: {
        enabled: true,
        failOnError: true,
        autoSubfolderIndex: true,
        concurrency: 14,
        crawlLinks: true,
        filter: ({ path }: any) => !path.startsWith('/testing'),
        retryCount: 2,
        retryDelay: 2000,
        onSuccess: (page) => {
          console.log(`Rendered ${page.page.path}`)
        },
      },
    }),
    react(),
  ],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
})

export default config

declare global {
  const APP_VERSION: string
}

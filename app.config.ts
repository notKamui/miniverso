import { defineConfig } from '@tanstack/start/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    preset: 'bun',
  },
  tsr: {
    generatedRouteTree: './app/gen/route-tree.gen.ts',
    autoCodeSplitting: true,
  },
  vite: {
    plugins: [tsconfigPaths() as any],
  },
  react: {
    babel: {
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
    },
  },
})

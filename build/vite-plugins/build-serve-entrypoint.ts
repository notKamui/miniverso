import { build as viteBuild, type PluginOption } from 'vite'

export function buildServeEntrypoint(): PluginOption {
  return {
    apply: 'build',
    name: 'build-serve-entrypoint',
    async closeBundle() {
      await viteBuild({
        appType: 'custom',
        build: {
          ssr: 'scripts/serve.ts',
          copyPublicDir: false,
          emptyOutDir: false,
          minify: 'oxc',
          outDir: 'dist',
          rolldownOptions: {
            external: (id) => !id.startsWith('.') && !id.startsWith('/'),
            output: {
              entryFileNames: 'serve.js',
              format: 'es',
              codeSplitting: false,
            },
          },
          target: 'node25',
        },
        configFile: false,
        oxc: {
          target: 'node25',
        },
      })
    },
  }
}

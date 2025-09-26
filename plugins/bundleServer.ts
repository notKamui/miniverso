import { build } from 'esbuild'
import type { Plugin } from 'vite'

/**
 * bundleServer plugin
 *
 * After the client build finishes, this plugin bundles the runtime entrypoint
 * (`serve.ts` by default – your production Bun server / entry) into a single
 * ESM file inside `dist/entrypoint.js` so deployments can just run:
 *   bun dist/entrypoint.js
 *
 * Rationale:
 * - Keeps server entry deterministic & tree-shaken
 * - Avoids extra esbuild direct dependency (Bun implements API internally)
 * - Mirrors output path expected by production `serve.ts` (SERVER_ENTRY)
 */
export function bundleServer(
  options: { entry?: string; outFile?: string; minify?: boolean } = {},
): Plugin {
  // We bundle the production runtime orchestrator (serve.ts) – not the SSR handler.
  const entry = options.entry ?? 'serve.ts'
  const outFile = options.outFile ?? 'dist/entrypoint.js'
  const minify = options.minify ?? false
  let applied = false

  return {
    name: 'bundle-server-entry',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      if (applied) return
      applied = true
      try {
        await build({
          entryPoints: [entry],
          outfile: outFile,
          platform: 'node', // Bun is Node-compatible for this code path
          format: 'esm',
          target: 'esnext',
          bundle: true,
          sourcemap: true,
          minify,
          legalComments: 'none',
          banner: { js: '// Bundled runtime entrypoint (serve.ts)' },
          external: [
            // Let these resolve at runtime (already present in deps)
            'postgres',
            'drizzle-orm',
            'drizzle-orm/postgres-js',
            'drizzle-orm/postgres-js/migrator',
          ],
        })
        console.log(
          `[bundle-server] ✅ Bundled entrypoint '${entry}' -> ${outFile}`,
        )
      } catch (err) {
        console.error('[bundle-server] ❌ Error bundling server entry:', err)
      }
    },
  }
}

export default bundleServer

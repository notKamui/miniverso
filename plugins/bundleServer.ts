import { existsSync, promises as fs, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
  const distRoot = 'dist'

  async function ensureDir(path: string) {
    await fs.mkdir(path, { recursive: true })
  }

  async function copyMigrations() {
    const src = '.drizzle'
    const dst = join(distRoot, '.drizzle')
    if (!existsSync(src)) return
    const entries = (await fs.readdir(src, { recursive: true })) as string[]
    for (const rel of entries) {
      const from = join(src, rel)
      const to = join(dst, rel)
      const stat = await fs.stat(from).catch(() => null)
      if (!stat) continue
      if (stat.isDirectory()) {
        await ensureDir(to)
      } else {
        await ensureDir(dirname(to))
        await fs.copyFile(from, to)
      }
    }
    console.log('[bundle-server] Copied .drizzle migrations')
  }

  async function writeMinimalPackageJson() {
    const rootPkgPath = 'package.json'
    if (!existsSync(rootPkgPath)) return
    const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'))
    const minimal = {
      name: pkg.name,
      version: pkg.version,
      private: true,
      type: pkg.type || 'module',
      scripts: { start: 'bun entrypoint.js' },
      dependencies: pkg.dependencies || {},
    }
    await fs.writeFile(
      join(distRoot, 'package.json'),
      JSON.stringify(minimal, null, 2) + '\n',
      'utf8',
    )
    console.log('[bundle-server] Wrote minimal dist/package.json')
  }

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
          sourcemap: false,
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

        await Promise.all([copyMigrations(), writeMinimalPackageJson()])

        // Defensive: remove any stray .map files (from other plugins) if present
        try {
          if (existsSync(distRoot)) {
            const entries = (await fs.readdir(distRoot, {
              recursive: true,
            })) as string[]
            const maps = entries.filter((e) => e.endsWith('.map'))
            if (maps.length) {
              await Promise.all(maps.map((m) => fs.rm(join(distRoot, m))))
              console.log(
                `[bundle-server] Removed ${maps.length} sourcemap file(s)`,
              )
            }
          }
        } catch (e) {
          console.warn('[bundle-server] Warning while cleaning .map files:', e)
        }
      } catch (err) {
        console.error('[bundle-server] ❌ Error bundling server entry:', err)
      }
    },
  }
}

export default bundleServer

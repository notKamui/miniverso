import { existsSync, promises as fs, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import type { Plugin } from 'vite'

/**
 * bundleServer plugin (relocated to plugins/server/)
 *
 * Bundles the production runtime entrypoint (Bun server orchestrator) into
 * dist/entrypoint.js. The default entry path has changed due to relocation.
 */
export function bundleBunServer(
  options: { entry?: string; outFile?: string; minify?: boolean } = {},
): Plugin {
  const entry = options.entry
    ? options.entry
    : join(fileURLToPath(new URL('.', import.meta.url)), 'serve.ts')
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

  async function copyFullPackageJson() {
    const rootPkgPath = 'package.json'
    if (!existsSync(rootPkgPath)) return
    const raw = readFileSync(rootPkgPath, 'utf8')
    try {
      const pkg = JSON.parse(raw)
      pkg.scripts = { start: 'bun entrypoint.js' }
      await fs.writeFile(
        join(distRoot, 'package.json'),
        `${JSON.stringify(pkg, null, 2)}\n`,
        'utf8',
      )
      console.log(
        '[bundle-server] Wrote pruned package.json (start only) to dist/',
      )
    } catch {
      await fs.writeFile(join(distRoot, 'package.json'), raw, 'utf8')
      console.warn(
        '[bundle-server] Failed to prune scripts; copied full package.json',
      )
    }
  }

  async function copyLockfile() {
    const lockFiles = ['bun.lock', 'bun.lockb']
    for (const lockFile of lockFiles) {
      if (existsSync(lockFile)) {
        await fs.copyFile(lockFile, join(distRoot, lockFile))
      }
    }
    console.log('[bundle-server] Copied lockfiles to dist/')
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
          platform: 'node',
          format: 'esm',
          target: 'esnext',
          bundle: true,
          sourcemap: false,
          minify,
          legalComments: 'none',
          banner: { js: '// Bundled runtime entrypoint (serve.ts relocated)' },
          external: [
            'postgres',
            'drizzle-orm',
            'drizzle-orm/postgres-js',
            'drizzle-orm/postgres-js/migrator',
          ],
        })
        console.log(
          `[bundle-server] ✅ Bundled entrypoint '${entry}' -> ${outFile}`,
        )
        await Promise.all([
          copyMigrations(),
          copyFullPackageJson(),
          copyLockfile(),
        ])

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

export default bundleBunServer

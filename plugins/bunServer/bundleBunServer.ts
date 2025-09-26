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
  options: {
    entry?: string
    outFile?: string
    minify?: boolean
    beforeStartHooks?: string[]
    afterStartHooks?: string[]
    additionalDistPaths?: string[]
  } = {},
): Plugin {
  const entry = options.entry
    ? options.entry
    : join(fileURLToPath(new URL('.', import.meta.url)), 'serve.ts')
  const outFile = options.outFile ?? 'dist/entrypoint.js'
  const minify = options.minify ?? false
  const beforeHooks = options.beforeStartHooks ?? []
  const afterHooks = options.afterStartHooks ?? []
  const additionalDistPaths = options.additionalDistPaths ?? ['.drizzle']

  async function buildInlineWrapper(): Promise<string> {
    // We generate a temporary wrapper file that imports the base serve.ts (which exports main())
    // and inlines the configured hooks directly so they are visible in the final bundled output.
    const wrapperPath = join('.mini_tmp', 'bunServer-inline-entry.ts')
    await fs.mkdir(dirname(wrapperPath), { recursive: true })

    function emitImports(list: string[], kind: 'before' | 'after') {
      return list
        .map((spec, idx) => {
          const [mod, named] = spec.split('#')
          const local = `${kind}Hook${idx}`
          if (named) return `import { ${named} as ${local} } from '${mod}'`
          return `import ${local} from '${mod}'`
        })
        .join('\n')
    }

    const beforeImports = emitImports(beforeHooks, 'before')
    const afterImports = emitImports(afterHooks, 'after')
    const beforeArray = beforeHooks.map((_, i) => `beforeHook${i}`).join(', ')
    const afterArray = afterHooks.map((_, i) => `afterHook${i}`).join(', ')

    const source = `// AUTO-GENERATED INLINE ENTRY (bundleBunServer)
// Hooks are inlined so that their code is visible in the final entrypoint bundle.
import { main as baseMain } from '${entry.replace(/\\/g, '/')}'
${beforeImports}${beforeImports ? '\n' : ''}${afterImports}${afterImports ? '\n' : ''}

async function run() {
  const beforeHooks = [${beforeArray}].filter(Boolean)
  const afterHooks = [${afterArray}].filter(Boolean)
  if (beforeHooks.length) console.log('[bunServer] Running', beforeHooks.length, 'before hook(s)')
  for (const hook of beforeHooks) {
    try { await hook() } catch (err) { console.error('[bunServer] Error in before hook:', err); process.exit(1) }
  }
  await baseMain()
  if (afterHooks.length) console.log('[bunServer] Scheduling', afterHooks.length, 'after hook(s)')
  for (const hook of afterHooks) {
    Promise.resolve().then(() => hook()).catch(e => console.error('[bunServer] Error in after hook:', e))
  }
}
run().catch(e => { console.error('[bunServer] Fatal error starting server:', e); process.exit(1) })
`
    await fs.writeFile(wrapperPath, source, 'utf8')
    return wrapperPath
  }
  let applied = false
  const distRoot = 'dist'

  async function ensureDir(path: string) {
    await fs.mkdir(path, { recursive: true })
  }

  async function copyAdditionalPaths() {
    for (const relPath of additionalDistPaths) {
      if (!existsSync(relPath)) {
        console.warn(`[bundle-server] Skipping missing path: ${relPath}`)
        continue
      }
      const stat = await fs.stat(relPath).catch(() => null)
      if (!stat) continue
      const targetBase = join(distRoot, relPath)
      if (stat.isFile()) {
        await ensureDir(dirname(targetBase))
        await fs.copyFile(relPath, targetBase)
        console.log(`[bundle-server] Copied file: ${relPath}`)
      } else if (stat.isDirectory()) {
        const entries = (await fs.readdir(relPath, {
          recursive: true,
        })) as string[]
        for (const entryRel of entries) {
          const from = join(relPath, entryRel)
          const st = await fs.stat(from).catch(() => null)
          if (!st) continue
          const to = join(targetBase, entryRel)
          if (st.isDirectory()) {
            await ensureDir(to)
          } else {
            await ensureDir(dirname(to))
            await fs.copyFile(from, to)
          }
        }
        console.log(`[bundle-server] Copied directory: ${relPath}`)
      }
    }
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
        const wrapper = await buildInlineWrapper()
        await build({
          entryPoints: [wrapper],
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
          copyAdditionalPaths(),
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
        // Cleanup temporary inline wrapper directory
        try {
          if (existsSync('.mini_tmp')) {
            await fs.rm('.mini_tmp', { recursive: true, force: true })
            // eslint-disable-next-line no-console
            console.log('[bundle-server] Cleaned temporary .mini_tmp directory')
          }
        } catch (e) {
          console.warn('[bundle-server] Failed to remove .mini_tmp:', e)
        }
      } catch (err) {
        console.error('[bundle-server] ❌ Error bundling server entry:', err)
      }
    },
  }
}

export default bundleBunServer

#!/usr/bin/env bun

/**
 * Generates a self-contained runtime distribution layout after `bun run build`.
 *
 * Produces:
 *   dist/
 *     client/
 *     server/
 *     entrypoint.js
 *     package.json (minimal, prod deps only, start script)
 *     .drizzle/
 *
 * Steps:
 * 1. Read root package.json
 * 2. Create minimal package.json in dist
 * 3. Copy .drizzle directory (if exists)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

interface RootPkg {
  name: string
  version: string
  type?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist')

function log(msg: string) {
  console.log(`[dist-build] ${msg}`)
}

async function ensureDir(p: string) {
  if (!existsSync(p)) await mkdir(p, { recursive: true })
}

async function copyRecursive(src: string, dst: string) {
  if (!existsSync(src)) return
  await ensureDir(dst)
  const entries = await readdir(src, { recursive: true })
  for (const rel of entries) {
    const from = join(src, rel as string)
    const to = join(dst, rel as string)
    let s: any
    try {
      s = await stat(from)
    } catch {
      continue
    }
    if (s.isDirectory()) {
      await ensureDir(to)
    } else {
      await ensureDir(join(to, '..'))
      try {
        await copyFile(from, to)
      } catch (err) {
        console.warn('[dist-build] Skipped file', from, err)
      }
    }
  }
}

async function writeMinimalPackageJson(rootPkg: RootPkg) {
  const minimal = {
    name: rootPkg.name,
    version: rootPkg.version,
    private: true,
    type: rootPkg.type || 'module',
    engines: undefined,
    scripts: {
      start: 'bun entrypoint.js',
    },
    dependencies: rootPkg.dependencies || {},
  }
  const outPath = join(DIST, 'package.json')
  writeFileSync(outPath, `${JSON.stringify(minimal, null, 2)}\n`)
  log(
    `Wrote minimal package.json with ${Object.keys(minimal.dependencies).length} dependencies`,
  )
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('dist folder not found. Run build first.')
    process.exit(1)
  }
  const pkg: RootPkg = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  )
  await writeMinimalPackageJson(pkg)

  // Copy migrations (.drizzle)
  await copyRecursive(join(ROOT, '.drizzle'), join(DIST, '.drizzle'))
  if (existsSync(join(ROOT, '.drizzle'))) log('Copied .drizzle')

  log('Runtime dist augmentation complete.')
}

await main().catch((err) => {
  console.error('[dist-build] Error:', err)
  process.exit(1)
})

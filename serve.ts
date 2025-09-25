import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/lib/env/server'

const CLIENT_DIR = './dist/client'
const SERVER_ENTRY = './dist/server/server.js'

// Configuration (can be driven by env vars; using process.env directly to avoid extending typed env schema)
const MAX_PRELOAD_BYTES = Number(
  process.env.STATIC_PRELOAD_MAX_BYTES ?? 2 * 1024 * 1024, // 2MB default
)

// Comma-separated include patterns (simple glob * -> .*). If provided, only matching files are eligible.
const INCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_INCLUDE || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)

// Comma-separated exclude patterns; applied after include.
const EXCLUDE_PATTERNS = (
  process.env.STATIC_PRELOAD_EXCLUDE || '*.map,*.txt,*.LICENSE.txt'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)

async function runDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

function globToRegExp(glob: string): RegExp {
  // Escape regex significant chars except * then replace * with .*
  const escaped = glob
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

interface PreloadedAssetMeta {
  route: string
  size: number
  type: string
}

interface StaticPreloadResult {
  responses: Record<string, () => Response>
  skipped: PreloadedAssetMeta[]
  loaded: PreloadedAssetMeta[]
}

function shouldInclude(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() || relativePath
  if (INCLUDE_PATTERNS.length > 0) {
    if (!INCLUDE_PATTERNS.some((r) => r.test(fileName))) return false
  }
  if (EXCLUDE_PATTERNS.some((r) => r.test(fileName))) return false
  return true
}

async function buildStaticRoutes(
  clientDir: string,
): Promise<StaticPreloadResult> {
  const responses: StaticPreloadResult['responses'] = {}
  const loaded: PreloadedAssetMeta[] = []
  const skipped: PreloadedAssetMeta[] = []

  console.log(`📦 Loading static assets from ${clientDir}...`)
  let loadedBytesTotal = 0

  try {
    const files = await readdir(clientDir, { recursive: true })
    for (const relativePath of files) {
      const filepath = join(clientDir, relativePath)
      const route = `/${relativePath.replace(/\\/g, '/')}`
      try {
        const file = Bun.file(filepath)
        if (!file || !(await file.exists())) continue
        if (file.size === 0) continue

        const fileMeta: PreloadedAssetMeta = {
          route,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }

        const include = shouldInclude(relativePath)
        const tooBig = file.size > MAX_PRELOAD_BYTES
        if (!include || tooBig) {
          skipped.push(fileMeta)
          responses[route] = () => {
            const file = Bun.file(filepath)
            return new Response(file, {
              headers: {
                'Content-Type': fileMeta.type,
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }
          continue
        }

        const bytes = await file.bytes()
        responses[route] = () =>
          new Response(bytes, {
            headers: {
              'Content-Type': fileMeta.type,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        loaded.push({ ...fileMeta, size: bytes.byteLength })
        loadedBytesTotal += bytes.byteLength
      } catch (error: any) {
        if (error?.code !== 'EISDIR') {
          console.error(`❌ Failed to load ${filepath}:`, error)
        }
      }
    }

    if (loaded.length > 0) {
      console.log(
        `✅ Preloaded ${loaded.length} static files (${(loadedBytesTotal / 1024 / 1024).toFixed(2)} MB) into memory`,
      )
    } else {
      console.warn('⚠️ No static files preloaded')
    }

    if (skipped.length > 0) {
      const big = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length
      const filtered = skipped.length - big
      console.log(
        `ℹ️ Skipped ${skipped.length} files (${big} too large, ${filtered} filtered by pattern) – will serve from disk on demand`,
      )
    }

    const VERBOSE = (process.env.STATIC_PRELOAD_VERBOSE || 'true') === 'true'
    if (VERBOSE) {
      console.log('\n📁 Preloaded files:')
      loaded
        .sort((a, b) => a.route.localeCompare(b.route))
        .forEach((f) => {
          const sizeKB = (f.size / 1024).toFixed(2)
          console.log(
            `   ${f.route.padEnd(50)} ${sizeKB.padStart(10)} KB  [${f.type}]`,
          )
        })
      if (skipped.length) {
        console.log('\n🚫 Skipped files:')
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((f) => {
            const sizeKB = (f.size / 1024).toFixed(2)
            const reason = f.size > MAX_PRELOAD_BYTES ? 'too large' : 'filtered'
            console.log(
              `   ${f.route.padEnd(50)} ${sizeKB.padStart(10)} KB  (${reason})`,
            )
          })
      }
    }
  } catch (error) {
    console.error(`❌ Failed during static preload from ${clientDir}:`)
    console.error(error)
  }

  return { responses, skipped, loaded }
}

async function startServer() {
  console.log('🚀 Starting production server...')

  let handler: any
  try {
    const serverModule = await import(SERVER_ENTRY)
    handler = serverModule.default
    console.log('✅ TanStack Start handler loaded')
  } catch (error) {
    console.error('❌ Failed to load server handler:', error)
    process.exit(1)
  }

  const { responses: preloaded } = await buildStaticRoutes(CLIENT_DIR)

  const server = Bun.serve({
    port: env.PORT,
    routes: {
      ...preloaded,
      '/*': handler.fetch,
    },
    error(error) {
      console.error('Uncaught server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })

  console.log(`\n🚀 Server running at http://localhost:${server.port}\n`)
}

await runDatabaseMigrations().catch((error: unknown) => {
  console.error('Failed to run database migrations:', error)
  process.exit(1)
})

await startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

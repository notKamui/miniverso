/**
 * TanStack Start Production Server with Bun
 *
 * A high-performance production server for TanStack Start applications that
 * implements intelligent static asset loading with configurable memory management.
 *
 * Features:
 * - Hybrid loading strategy (preload small files, serve large files on-demand)
 * - Configurable file filtering with include/exclude patterns
 * - Memory-efficient response generation
 * - Production-ready caching headers
 *
 * Environment Variables:
 *
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * STATIC_PRELOAD_MAX_BYTES (number)
 *   - Maximum file size in bytes to preload into memory
 *   - Files larger than this will be served on-demand from disk
 *   - Default: 5242880 (5MB)
 *   - Example: STATIC_PRELOAD_MAX_BYTES=5242880 (5MB)
 *
 * STATIC_PRELOAD_INCLUDE (string)
 *   - Comma-separated list of glob patterns for files to include
 *   - If specified, only matching files are eligible for preloading
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: STATIC_PRELOAD_INCLUDE="*.js,*.css,*.woff2"
 *
 * STATIC_PRELOAD_EXCLUDE (string)
 *   - Comma-separated list of glob patterns for files to exclude
 *   - Applied after include patterns
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: STATIC_PRELOAD_EXCLUDE="*.map,*.txt"
 *
 * STATIC_PRELOAD_VERBOSE (boolean)
 *   - Enable detailed logging of loaded and skipped files
 *   - Default: false
 *   - Set to "true" to enable verbose output
 *
 * STATIC_PRELOAD_ETAG (boolean)
 *   - Enable ETag generation and conditional 304 responses for preloaded assets
 *   - Default: true
 *
 * STATIC_PRELOAD_GZIP (boolean)
 *   - Enable gzip precompression for eligible preloaded assets
 *   - Default: true
 *
 * STATIC_PRELOAD_GZIP_MIN_BYTES (number)
 *   - Minimum size (in bytes) before a file is considered for gzip
 *   - Default: 1024 (1KB)
 *
 * STATIC_PRELOAD_GZIP_TYPES (string)
 *   - Comma-separated list of MIME types or prefixes (ending with /) that can be gzip-precompressed
 *   - Default: text/,application/javascript,application/json,application/xml,image/svg+xml
 *
 * Usage:
 *   bun run server.ts
 */

import { env } from '@/lib/env/server'
import { tryAsync, tryInline } from '@/lib/utils/try'

// Configuration
const PORT = env.PORT
const CLIENT_DIR = './dist/client'
const SERVER_ENTRY = './dist/server/server.js'

// Preloading configuration from environment variables
const MAX_PRELOAD_BYTES = Number(
  process.env.STATIC_PRELOAD_MAX_BYTES ?? 5 * 1024 * 1024, // 5MB default
)

// Parse comma-separated include patterns (no defaults)
const INCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_INCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)

// Parse comma-separated exclude patterns (no defaults)
const EXCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_EXCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)

// Verbose logging flag
const VERBOSE = process.env.STATIC_PRELOAD_VERBOSE === 'true'

// Optional features
const ENABLE_ETAG = (process.env.STATIC_PRELOAD_ETAG || 'true') === 'true'
const ENABLE_GZIP = (process.env.STATIC_PRELOAD_GZIP || 'true') === 'true'
const GZIP_MIN_BYTES = Number(process.env.STATIC_PRELOAD_GZIP_MIN_BYTES || 1024) // 1KB
const GZIP_TYPES = (
  process.env.STATIC_PRELOAD_GZIP_TYPES ||
  'text/,application/javascript,application/json,application/xml,image/svg+xml'
)
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

/**
 * Convert a simple glob pattern to a regular expression
 * Supports * wildcard for matching any characters
 */
function globToRegExp(glob: string): RegExp {
  // Escape regex special chars except *, then replace * with .*
  const escaped = glob
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

/**
 * Metadata for preloaded static assets
 */
interface AssetMetadata {
  route: string
  size: number
  type: string
}

/**
 * Result of static asset preloading process
 */
interface PreloadResult {
  routes: Record<string, (req: Request) => Response | Promise<Response>>
  loaded: Array<AssetMetadata>
  skipped: Array<AssetMetadata>
}

/**
 * Check if a file should be included based on configured patterns
 */
function shouldInclude(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath

  if (INCLUDE_PATTERNS.length > 0) {
    if (!INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
      return false
    }
  }

  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false
  }

  return true
}

function matchesCompressible(type: string) {
  return GZIP_TYPES.some((t) =>
    t.endsWith('/') ? type.startsWith(t) : type === t,
  )
}

interface InMemoryAsset {
  raw: Uint8Array
  gz?: Uint8Array
  etag?: string
  type: string
  immutable: boolean
  size: number
}

function computeEtag(data: Uint8Array): string {
  const hash = Bun.hash(data)
  return `W/"${hash.toString(16)}-${data.byteLength}"`
}

function formatKB(bytes: number) {
  const kb = bytes / 1024
  return kb < 100 ? kb.toFixed(2) : kb.toFixed(1)
}

function buildResponseFactory(
  asset: InMemoryAsset,
): (req: Request) => Response {
  return (req: Request) => {
    const headers: Record<string, string> = {
      'Content-Type': asset.type,
      'Cache-Control': asset.immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600',
    }

    if (ENABLE_ETAG && asset.etag) {
      const ifNone = req.headers.get('if-none-match')
      if (ifNone && ifNone === asset.etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: asset.etag },
        })
      }
      headers.ETag = asset.etag
    }

    if (
      ENABLE_GZIP &&
      asset.gz &&
      req.headers.get('accept-encoding')?.includes('gzip')
    ) {
      console.log(`Serving precompressed asset for ${req.url}`)

      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = String(asset.gz.byteLength)
      const gzCopy = new Uint8Array(asset.gz)
      return new Response(gzCopy, { status: 200, headers })
    }

    headers['Content-Length'] = String(asset.raw.byteLength)
    const rawCopy = new Uint8Array(asset.raw)
    return new Response(rawCopy, { status: 200, headers })
  }
}

async function gzipMaybe(
  data: Uint8Array<ArrayBuffer>,
  type: string,
): Promise<Uint8Array | undefined> {
  if (!ENABLE_GZIP) return undefined
  if (data.byteLength < GZIP_MIN_BYTES) return undefined
  if (!matchesCompressible(type)) return undefined
  const [error, gz] = tryInline(() => Bun.gzipSync(data))
  if (error) return undefined
  return gz
}

function makeOnDemandFactory(filepath: string, type: string) {
  return (_req: Request) => {
    const f = Bun.file(filepath)
    return new Response(f, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}

function buildCompositeGlob(): Bun.Glob {
  const raw = (process.env.STATIC_PRELOAD_INCLUDE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (raw.length === 0) return new Bun.Glob('**/*')
  if (raw.length === 1) return new Bun.Glob(raw[0])
  return new Bun.Glob(`{${raw.join(',')}}`)
}

/**
 * Build static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function buildStaticRoutes(clientDir: string): Promise<PreloadResult> {
  const routes: Record<string, (req: Request) => Response | Promise<Response>> =
    {}
  const loaded: Array<AssetMetadata> = []
  const skipped: Array<AssetMetadata> = []

  console.log(`📦 Loading static assets from ${clientDir}...`)
  console.log(
    `   Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`,
  )
  if (INCLUDE_PATTERNS.length > 0) {
    console.log(
      `   Include patterns: ${process.env.STATIC_PRELOAD_INCLUDE ?? ''}`,
    )
  }
  if (EXCLUDE_PATTERNS.length > 0) {
    console.log(
      `   Exclude patterns: ${process.env.STATIC_PRELOAD_EXCLUDE ?? ''}`,
    )
  }
  console.log('   ETag generation:', ENABLE_ETAG ? 'enabled' : 'disabled')
  console.log('   Gzip precompression:', ENABLE_GZIP ? 'enabled' : 'disabled')
  if (ENABLE_GZIP) {
    console.log(`      Gzip min size: ${(GZIP_MIN_BYTES / 1024).toFixed(2)} kB`)
    console.log(`      Gzip types: ${GZIP_TYPES.join(', ')}`)
  }

  let totalPreloadedBytes = 0
  const gzSizes: Record<string, number> = {}

  try {
    const glob = buildCompositeGlob()
    for await (const relativePath of glob.scan({ cwd: clientDir })) {
      const filepath = `${clientDir}/${relativePath}`
      const route = `/${relativePath}`

      try {
        const file = Bun.file(filepath)

        if (!(await file.exists()) || file.size === 0) {
          continue
        }

        const metadata: AssetMetadata = {
          route,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }

        const matchesPattern = shouldInclude(relativePath)
        const withinSizeLimit = file.size <= MAX_PRELOAD_BYTES

        if (matchesPattern && withinSizeLimit) {
          const bytes = new Uint8Array(await file.arrayBuffer())
          const gz = await gzipMaybe(bytes, metadata.type)
          const etag = ENABLE_ETAG ? computeEtag(bytes) : undefined
          const asset: InMemoryAsset = {
            raw: bytes,
            gz,
            etag,
            type: metadata.type,
            immutable: true,
            size: bytes.byteLength,
          }
          routes[route] = buildResponseFactory(asset)
          loaded.push({ ...metadata, size: bytes.byteLength })
          totalPreloadedBytes += bytes.byteLength
          if (gz) gzSizes[route] = gz.byteLength
        } else {
          routes[route] = makeOnDemandFactory(filepath, metadata.type)
          skipped.push(metadata)
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'EISDIR') {
          console.error(`❌ Failed to load ${filepath}:`, error)
        }
      }
    }

    if (loaded.length > 0 || skipped.length > 0) {
      const allFiles = [...loaded, ...skipped].sort((a, b) =>
        a.route.localeCompare(b.route),
      )

      const maxPathLength = Math.min(
        Math.max(...allFiles.map((f) => f.route.length)),
        60,
      )

      if (loaded.length > 0) {
        console.log('\n📁 Preloaded into memory:')
        loaded
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const sizeStr = `${formatKB(file.size).padStart(7)} kB`
            const paddedPath = file.route.padEnd(maxPathLength)
            const gzSize = gzSizes[file.route]
            if (gzSize) {
              const gzStr = `${formatKB(gzSize).padStart(7)} kB`
              console.log(`   ${paddedPath} ${sizeStr} │ gzip: ${gzStr}`)
            } else {
              console.log(`   ${paddedPath} ${sizeStr}`)
            }
          })
      }

      if (skipped.length > 0) {
        console.log('\n💾 Served on-demand:')
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const sizeStr = `${formatKB(file.size).padStart(7)} kB`
            const paddedPath = file.route.padEnd(maxPathLength)
            console.log(`   ${paddedPath} ${sizeStr}`)
          })
      }

      if (VERBOSE) {
        console.log('\n📊 Detailed file information:')
        allFiles.forEach((file) => {
          const isPreloaded = loaded.includes(file)
          const status = isPreloaded ? '[MEMORY]' : '[ON-DEMAND]'
          const reason =
            !isPreloaded && file.size > MAX_PRELOAD_BYTES
              ? ' (too large)'
              : !isPreloaded
                ? ' (filtered)'
                : ''
          console.log(
            `   ${status.padEnd(12)} ${file.route} - ${file.type}${reason}`,
          )
        })
      }
    }

    console.log()
    if (loaded.length > 0) {
      console.log(
        `✅ Preloaded ${String(loaded.length)} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB) into memory`,
      )
    } else {
      console.log('ℹ️  No files preloaded into memory')
    }

    if (skipped.length > 0) {
      const tooLarge = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length
      const filtered = skipped.length - tooLarge
      console.log(
        `ℹ️  ${String(skipped.length)} files will be served on-demand (${String(tooLarge)} too large, ${String(filtered)} filtered)`,
      )
    }
  } catch (error) {
    console.error(`❌ Failed to load static files from ${clientDir}:`, error)
  }

  return { routes, loaded, skipped }
}

/**
 * Start the production server
 */
async function startServer() {
  console.log('🚀 Starting production server...')

  type Fetch = (request: Request) => Response | Promise<Response>

  const [error, module] = await tryAsync(
    import(SERVER_ENTRY) as Promise<{ default: { fetch: Fetch } }>,
  )

  if (error) {
    console.error('❌ Failed to load server module:', error)
    process.exit(1)
  }

  const handler = module.default

  const { routes } = await buildStaticRoutes(CLIENT_DIR)

  const server = Bun.serve({
    port: PORT,
    routes: {
      ...routes,
      '/*': (req: Request) => handler.fetch(req),
    },
    error(error) {
      console.error('Uncaught server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })

  console.log(
    `\n🚀 Server running at http://localhost:${String(server.port)}\n`,
  )
}

async function runDatabaseMigrations() {
  const { default: postgres } = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')

  const postgresClient = postgres(env.DATABASE_URL)
  const db = drizzle({ client: postgresClient })
  console.log('ℹ️ Running migrations...')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('✅ Migrations completed successfully.\n')
}

await runDatabaseMigrations().catch((error: unknown) => {
  console.error('Failed to run database migrations:', error)
  process.exit(1)
})

await startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

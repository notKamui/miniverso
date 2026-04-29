// oxlint-disable unicorn/no-process-exit

/**
 * TanStack Start production server with srvx + Node APIs.
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
 *   pnpm build && pnpm start
 */

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { extname, join, posix } from 'node:path'
import { gzipSync } from 'node:zlib'
import { FastResponse, serve } from 'srvx'
import { env } from '@/lib/env/server'
import { tryAsync, tryInline } from '@/lib/utils/try'
import { runDatabaseMigrations } from './migrate'

// Configuration
const PORT = env.PORT
const CLIENT_DIR = new URL(/* @vite-ignore */ '../dist/client', import.meta.url).pathname
const SERVER_ENTRY = new URL(/* @vite-ignore */ '../dist/server/server.js', import.meta.url)
  .pathname

// Preloading configuration from environment variables
const MAX_PRELOAD_BYTES = Number(
  process.env.STATIC_PRELOAD_MAX_BYTES ?? 5 * 1024 * 1024, // 5MB default
)

// Parse comma-separated include patterns (no defaults)
const INCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_INCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => globToRegExp(s))

// Parse comma-separated exclude patterns (no defaults)
const EXCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_EXCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => globToRegExp(s))

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
  const escaped = glob.replaceAll(/[-/\\^$+?.()|[\]{}]/g, String.raw`\$&`).replaceAll('*', '.*')
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
  loaded: AssetMetadata[]
  skipped: AssetMetadata[]
}

/**
 * Check if a file should be included based on configured patterns
 */
function shouldInclude(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath

  if (INCLUDE_PATTERNS.length > 0 && !INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false
  }

  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false
  }

  return true
}

function matchesCompressible(type: string) {
  return GZIP_TYPES.some((t) => (t.endsWith('/') ? type.startsWith(t) : type === t))
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
  const hash = createHash('sha1').update(data).digest('hex')
  return `W/"${hash}-${data.byteLength}"`
}

function formatKB(bytes: number) {
  const kb = bytes / 1024
  return kb < 100 ? kb.toFixed(2) : kb.toFixed(1)
}

function buildResponseFactory(asset: InMemoryAsset): (req: Request) => Response {
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
        return new FastResponse(null, {
          status: 304,
          headers: { ETag: asset.etag },
        })
      }
      headers.ETag = asset.etag
    }

    if (ENABLE_GZIP && asset.gz && req.headers.get('accept-encoding')?.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = String(asset.gz.byteLength)
      const gzCopy = new Uint8Array(asset.gz)
      return new FastResponse(gzCopy, { status: 200, headers })
    }

    headers['Content-Length'] = String(asset.raw.byteLength)
    const rawCopy = new Uint8Array(asset.raw)
    return new FastResponse(rawCopy, { status: 200, headers })
  }
}

function gzipMaybe(data: Uint8Array<ArrayBuffer>, type: string): Uint8Array | undefined {
  if (!ENABLE_GZIP) return undefined
  if (data.byteLength < GZIP_MIN_BYTES) return undefined
  if (!matchesCompressible(type)) return undefined
  const [error, gz] = tryInline(() => gzipSync(data))
  if (error) return undefined
  return gz
}

function makeOnDemandFactory(filepath: string, type: string) {
  return async (_req: Request) => {
    const file = await fs.readFile(filepath)
    return new FastResponse(file, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}

async function listClientFiles(clientDir: string, root = clientDir): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const relativePaths: string[] = []

  for (const entry of entries) {
    const absolutePath = join(root, entry.name)
    if (entry.isDirectory()) {
      relativePaths.push(...(await listClientFiles(clientDir, absolutePath)))
      continue
    }
    if (entry.isFile()) {
      relativePaths.push(posix.normalize(absolutePath.replace(`${clientDir}/`, '')))
    }
  }

  return relativePaths
}

/**
 * Build static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function buildStaticRoutes(clientDir: string): Promise<PreloadResult> {
  const routes: Record<string, (req: Request) => Response | Promise<Response>> = {}
  const loaded: AssetMetadata[] = []
  const skipped: AssetMetadata[] = []

  console.log(`📦 Loading static assets from ${clientDir}...`)
  console.log(`   Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`)
  if (INCLUDE_PATTERNS.length > 0) {
    console.log(`   Include patterns: ${process.env.STATIC_PRELOAD_INCLUDE ?? ''}`)
  }
  if (EXCLUDE_PATTERNS.length > 0) {
    console.log(`   Exclude patterns: ${process.env.STATIC_PRELOAD_EXCLUDE ?? ''}`)
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
    const files = await listClientFiles(clientDir)
    for (const relativePath of files) {
      const filepath = `${clientDir}/${relativePath}`
      const route = `/${relativePath}`

      try {
        const stat = await fs.stat(filepath)
        if (!stat.isFile() || stat.size === 0) {
          continue
        }

        const metadata: AssetMetadata = {
          route,
          size: stat.size,
          type: getMimeType(filepath),
        }

        const matchesPattern = shouldInclude(relativePath)
        const withinSizeLimit = stat.size <= MAX_PRELOAD_BYTES

        if (matchesPattern && withinSizeLimit) {
          const bytes = new Uint8Array(await fs.readFile(filepath))
          const gz = gzipMaybe(bytes, metadata.type)
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
      const allFiles = [...loaded, ...skipped].toSorted((a, b) => a.route.localeCompare(b.route))

      const maxPathLength = Math.min(Math.max(...allFiles.map((f) => f.route.length)), 60)

      if (loaded.length > 0) {
        console.log('\n📁 Preloaded into memory:')
        for (const file of loaded.toSorted((a, b) => a.route.localeCompare(b.route))) {
          const sizeStr = `${formatKB(file.size).padStart(7)} kB`
          const paddedPath = file.route.padEnd(maxPathLength)
          const gzSize = gzSizes[file.route]
          if (gzSize) {
            const gzStr = `${formatKB(gzSize).padStart(7)} kB`
            console.log(`   ${paddedPath} ${sizeStr} │ gzip: ${gzStr}`)
          } else {
            console.log(`   ${paddedPath} ${sizeStr}`)
          }
        }
      }

      if (skipped.length > 0) {
        console.log('\n💾 Served on-demand:')
        for (const file of skipped.toSorted((a, b) => a.route.localeCompare(b.route))) {
          const sizeStr = `${formatKB(file.size).padStart(7)} kB`
          const paddedPath = file.route.padEnd(maxPathLength)
          console.log(`   ${paddedPath} ${sizeStr}`)
        }
      }

      if (VERBOSE) {
        console.log('\n📊 Detailed file information:')
        for (const file of allFiles) {
          const isPreloaded = loaded.includes(file)
          const status = isPreloaded ? '[MEMORY]' : '[ON-DEMAND]'
          const reason =
            !isPreloaded && file.size > MAX_PRELOAD_BYTES
              ? ' (too large)'
              : !isPreloaded
                ? ' (filtered)'
                : ''
          console.log(`   ${status.padEnd(12)} ${file.route} - ${file.type}${reason}`)
        }
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

function getMimeType(filepath: string): string {
  const ext = extname(filepath).toLowerCase()
  const mimeByExt: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }
  return mimeByExt[ext] ?? 'application/octet-stream'
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

  const { routes } = await buildStaticRoutes(CLIENT_DIR)

  const server = serve({
    hostname: '0.0.0.0',
    port: PORT,
    async fetch(request: Request) {
      try {
        const pathname = new URL(request.url).pathname
        const staticHandler = routes[pathname]
        return staticHandler ? await staticHandler(request) : await module.default.fetch(request)
      } catch (error) {
        console.error('Uncaught server error:', error)
        return new FastResponse('Internal Server Error', { status: 500 })
      }
    },
  })

  await server.ready()
  console.log(`\n🚀 Server running at ${server.url}\n`)
}

async function main() {
  const [migrationError] = await tryAsync(runDatabaseMigrations())
  if (migrationError) {
    console.error('❌ Failed to run database migrations:', migrationError)
    process.exit(1)
  }

  const [serverError] = await tryAsync(startServer())
  if (serverError) {
    console.error('❌ Failed to start server:', serverError)
    process.exit(1)
  }
}

await main()

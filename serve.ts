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
 * Usage:
 *   bun run server.ts
 */

import { env } from '@/lib/env/server'

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
  routes: Record<string, () => Response>
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

/**
 * Build static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function buildStaticRoutes(clientDir: string): Promise<PreloadResult> {
  const { readdir } = await import('node:fs/promises')
  const { join } = await import('node:path')

  const routes: Record<string, () => Response> = {}
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

  let totalPreloadedBytes = 0

  try {
    const files = await readdir(clientDir, { recursive: true })

    for (const relativePath of files) {
      const filepath = join(clientDir, relativePath)
      const route = `/${relativePath.replace(/\\/g, '/')}` // Handle Windows paths

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
          // Preload small files into memory
          const bytes = await file.bytes()

          routes[route] = () =>
            new Response(bytes, {
              headers: {
                'Content-Type': metadata.type,
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            })

          loaded.push({ ...metadata, size: bytes.byteLength })
          totalPreloadedBytes += bytes.byteLength
        } else {
          // Serve large or filtered files on-demand
          routes[route] = () => {
            const fileOnDemand = Bun.file(filepath)
            return new Response(fileOnDemand, {
              headers: {
                'Content-Type': metadata.type,
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }

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

      const formatFileSize = (bytes: number) => {
        const kb = bytes / 1024
        // Rough gzip estimation (typically 30-70% compression)
        const gzipKb = kb * 0.35
        return {
          size: kb < 100 ? kb.toFixed(2) : kb.toFixed(1),
          gzip: gzipKb < 100 ? gzipKb.toFixed(2) : gzipKb.toFixed(1),
        }
      }

      if (loaded.length > 0) {
        console.log('\n📁 Preloaded into memory:')
        loaded
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `gzip: ${gzip.padStart(6)} kB`
            console.log(`   ${paddedPath} ${sizeStr} │ ${gzipStr}`)
          })
      }

      if (skipped.length > 0) {
        console.log('\n💾 Served on-demand:')
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `gzip: ${gzip.padStart(6)} kB`
            console.log(`   ${paddedPath} ${sizeStr} │ ${gzipStr}`)
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

  let handler: { fetch: (request: Request) => Response | Promise<Response> }
  try {
    const serverModule = (await import(SERVER_ENTRY)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> }
    }
    handler = serverModule.default
    console.log('✅ TanStack Start handler loaded')
  } catch (error) {
    console.error('❌ Failed to load server handler:', error)
    process.exit(1)
  }

  const { routes } = await buildStaticRoutes(CLIENT_DIR)

  const server = Bun.serve({
    port: PORT,
    routes: {
      ...routes,
      '/*': handler.fetch.bind(handler),
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

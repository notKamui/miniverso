/**
 * Clean base production server (hooks/migrations injected by bundler wrapper)
 */

// ------------------------------ Configuration ------------------------------
const PORT = Number(process.env.PORT || '3000')

async function resolveServerEntry(): Promise<string> {
  const primary = './server/server.js'
  try {
    const f = Bun.file(primary)
    if (await f.exists()) return primary
  } catch {}
  return './dist/server/server.js'
}

async function resolveClientDir(): Promise<string> {
  const candidate = './client'
  try {
    const g = new Bun.Glob('*')
    for await (const _ of g.scan({ cwd: candidate, onlyFiles: false })) {
      return candidate
    }
  } catch {}
  return './dist/client'
}

let SERVER_ENTRY = './dist/server/server.js'
let CLIENT_DIR = './dist/client'

// ---------------------------- Static Asset Setup --------------------------
const MAX_PRELOAD_BYTES = Number(
  process.env.STATIC_PRELOAD_MAX_BYTES ?? 5 * 1024 * 1024,
)
const INCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_INCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)
const EXCLUDE_PATTERNS = (process.env.STATIC_PRELOAD_EXCLUDE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(globToRegExp)
const VERBOSE = process.env.STATIC_PRELOAD_VERBOSE === 'true'
const ENABLE_ETAG = (process.env.STATIC_PRELOAD_ETAG || 'true') === 'true'
const ENABLE_GZIP = (process.env.STATIC_PRELOAD_GZIP || 'true') === 'true'
const GZIP_MIN_BYTES = Number(process.env.STATIC_PRELOAD_GZIP_MIN_BYTES || 1024)
const GZIP_TYPES = (
  process.env.STATIC_PRELOAD_GZIP_TYPES ||
  'text/,application/javascript,application/json,application/xml,image/svg+xml'
)
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

interface AssetMetadata {
  route: string
  size: number
  type: string
}
interface PreloadResult {
  routes: Record<string, (req: Request) => Response | Promise<Response>>
  loaded: AssetMetadata[]
  skipped: AssetMetadata[]
}

function shouldInclude(relativePath: string) {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath
  if (
    INCLUDE_PATTERNS.length > 0 &&
    !INCLUDE_PATTERNS.some((p) => p.test(fileName))
  )
    return false
  if (EXCLUDE_PATTERNS.some((p) => p.test(fileName))) return false
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

function computeEtag(data: Uint8Array) {
  const hash = Bun.hash(data)
  return `W/"${hash.toString(16)}-${data.byteLength}"`
}

function buildResponseFactory(asset: InMemoryAsset) {
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
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = String(asset.gz.byteLength)
      return new Response(new Uint8Array(asset.gz), { status: 200, headers })
    }
    headers['Content-Length'] = String(asset.raw.byteLength)
    return new Response(new Uint8Array(asset.raw), { status: 200, headers })
  }
}

async function gzipMaybe(data: Uint8Array<ArrayBuffer>, type: string) {
  if (!ENABLE_GZIP) return undefined
  if (data.byteLength < GZIP_MIN_BYTES) return undefined
  if (!matchesCompressible(type)) return undefined
  try {
    return Bun.gzipSync(data)
  } catch {
    return undefined
  }
}

function makeOnDemandFactory(filepath: string, type: string) {
  return (_req: Request) =>
    new Response(Bun.file(filepath), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
      },
    })
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

async function buildStaticRoutes(clientDir: string): Promise<PreloadResult> {
  const routes: PreloadResult['routes'] = {}
  const loaded: AssetMetadata[] = []
  const skipped: AssetMetadata[] = []
  console.log(`📦 Loading static assets from ${clientDir}...`)
  console.log(
    `   Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`,
  )
  if (INCLUDE_PATTERNS.length > 0)
    console.log(
      `   Include patterns: ${process.env.STATIC_PRELOAD_INCLUDE ?? ''}`,
    )
  if (EXCLUDE_PATTERNS.length > 0)
    console.log(
      `   Exclude patterns: ${process.env.STATIC_PRELOAD_EXCLUDE ?? ''}`,
    )
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
        if (!(await file.exists()) || file.size === 0) continue
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
      } catch (error) {
        if (error instanceof Error && error.name !== 'EISDIR')
          console.error(`❌ Failed to load ${filepath}:`, error)
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
      function formatKB(bytes: number) {
        const kb = bytes / 1024
        return kb < 100 ? kb.toFixed(2) : kb.toFixed(1)
      }
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
        `✅ Preloaded ${loaded.length} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB) into memory`,
      )
    } else {
      console.log('ℹ️  No files preloaded into memory')
    }
    if (skipped.length > 0) {
      const tooLarge = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length
      const filtered = skipped.length - tooLarge
      console.log(
        `ℹ️  ${skipped.length} files on-demand (${tooLarge} too large, ${filtered} filtered)`,
      )
    }
  } catch (error) {
    console.error(`❌ Failed to load static files from ${clientDir}:`, error)
  }
  return { routes, loaded, skipped }
}

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
    routes: { ...routes, '/*': (req: Request) => handler.fetch(req) },
    error(error) {
      console.error('Uncaught server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })
  console.log(`\n🚀 Server running at http://localhost:${server.port}\n`)
}

export async function main() {
  SERVER_ENTRY = await resolveServerEntry()
  CLIENT_DIR = await resolveClientDir()
  console.log(`ℹ️  Resolved SERVER_ENTRY: ${SERVER_ENTRY}`)
  console.log(`ℹ️  Resolved CLIENT_DIR:  ${CLIENT_DIR}`)
  await startServer().catch((error: unknown) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

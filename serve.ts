import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/lib/env/server'

const CLIENT_DIR = './dist/client'
const SERVER_ENTRY = './dist/server/server.js'

async function runDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

async function buildStaticRoutes(
  clientDir: string,
): Promise<Record<string, Response>> {
  const routes: Record<string, Response> = {}
  const loadedFiles: { route: string; size: number; type: string }[] = []

  console.log(`📦 Loading static assets from ${clientDir}...`)
  let fileCount = 0
  let totalSize = 0

  try {
    const files = await readdir(clientDir, { recursive: true })

    for (const relativePath of files) {
      const filepath = join(clientDir, relativePath)
      const route = `/${relativePath.replace(/\\/g, '/')}` // Handle Windows paths

      try {
        const file = Bun.file(filepath)

        if ((await file.exists()) && file.size === 0) continue

        const bytes = await file.bytes()
        const contentType = file.type || 'application/octet-stream'

        routes[route] = new Response(bytes, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache for hashed assets
          },
        })

        fileCount++
        totalSize += bytes.byteLength

        loadedFiles.push({
          route,
          size: bytes.byteLength,
          type: contentType,
        })
      } catch (error: any) {
        if (error?.code !== 'EISDIR') {
          console.error(`❌ Failed to load ${filepath}:`, error)
        }
      }
    }

    if (fileCount > 0) {
      console.log(
        `✅ Loaded ${fileCount} static files (${(totalSize / 1024 / 1024).toFixed(2)} MB) into memory`,
      )

      console.log('\n📁 Static files loaded:')
      loadedFiles
        .sort((a, b) => a.route.localeCompare(b.route))
        .forEach((file) => {
          const sizeKB = (file.size / 1024).toFixed(2)
          console.log(
            `   ${file.route.padEnd(50)} ${sizeKB.padStart(10)} KB  [${file.type}]`,
          )
        })
    } else {
      console.warn(`⚠️ No static files found in ${clientDir}`)
    }
  } catch (error) {
    console.error(`❌ Failed to load static files from ${clientDir}:`)
    console.error(error)
  }

  return routes
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

  const staticRoutes = await buildStaticRoutes(CLIENT_DIR)

  const server = Bun.serve({
    port: env.PORT,
    routes: {
      ...staticRoutes,
      '/*': (request) => {
        try {
          return handler.fetch(request)
        } catch (error) {
          console.error('Server handler error:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      },
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

import { file } from 'bun'
import { env } from '@/lib/env/server'

const DEVELOPMENT = env.NODE_ENV === 'development'
const PORT = Number.parseFloat(process.env.PORT || '3000')

async function applyDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

async function createViteDevServer() {
  const vite = await import('vite')
  const viteDevServer = await vite.createServer({
    server: { port: 5173, host: true },
  })
  await viteDevServer.listen()
  console.log('Vite dev server started on http://localhost:5173')
  return viteDevServer
}

function isViteAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/@') ||
    pathname.startsWith('/node_modules') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.svg') ||
    pathname.startsWith('/src/')
  )
}

async function createDevelopmentFetchHandler(viteDevServer: any) {
  return async function developmentFetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)

      // Proxy Vite assets (HMR, static files, etc.)
      if (isViteAsset(url.pathname)) {
        const viteUrl = `http://localhost:5173${url.pathname}${url.search}`
        const viteResponse = await fetch(viteUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        })

        return new Response(viteResponse.body, {
          status: viteResponse.status,
          statusText: viteResponse.statusText,
          headers: viteResponse.headers,
        })
      }

      // Load the server entry through Vite
      const { default: serverEntry } =
        await viteDevServer.ssrLoadModule('./src/server.ts')
      return await serverEntry.fetch(request)
    } catch (error) {
      console.error('Development server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

async function createProductionFetchHandler() {
  const { default: handler } = await import('./dist/server/server.js')

  return async function productionFetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)

      // Serve static files from dist/client
      if (url.pathname !== '/' && !url.pathname.startsWith('/api')) {
        const filePath = `./dist/client${url.pathname}`
        const staticFile = file(filePath)

        if (await staticFile.exists()) {
          return new Response(staticFile)
        }
      }

      // Handle all other requests with the React Start handler
      return await handler.fetch(request)
    } catch (error) {
      console.error('Production server error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

async function startDevelopmentServer() {
  const viteDevServer = await createViteDevServer()
  const fetchHandler = await createDevelopmentFetchHandler(viteDevServer)

  Bun.serve({
    port: PORT,
    fetch: fetchHandler,
  })

  console.log(`Development server is running on http://localhost:${PORT}`)
}

async function startProductionServer() {
  const fetchHandler = await createProductionFetchHandler()

  Bun.serve({
    port: PORT,
    fetch: fetchHandler,
  })

  console.log(`Production server is running on http://localhost:${PORT}`)
}

await applyDatabaseMigrations()

if (DEVELOPMENT) {
  await startDevelopmentServer()
} else {
  await startProductionServer()
}

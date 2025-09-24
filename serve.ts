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

await applyDatabaseMigrations()

if (DEVELOPMENT) {
  const vite = await import('vite')
  const viteDevServer = await vite.createServer({
    server: { port: 5173, host: true },
  })
  await viteDevServer.listen()

  console.log('Vite dev server started on http://localhost:5173')

  Bun.serve({
    port: PORT,
    async fetch(request: Request) {
      try {
        const url = new URL(request.url)

        // Proxy Vite assets (HMR, static files, etc.)
        if (
          url.pathname.startsWith('/@') ||
          url.pathname.startsWith('/node_modules') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.startsWith('/src/')
        ) {
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
    },
  })

  console.log(`Development server is running on http://localhost:${PORT}`)
} else {
  const { default: handler } = await import('./dist/server/server.js')

  Bun.serve({
    port: PORT,
    async fetch(request: Request) {
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
    },
  })

  console.log(`Production server is running on http://localhost:${PORT}`)
}

import express from 'express'
import { toNodeHandler } from 'srvx/node'
import { env } from '@/lib/env/server'

const DEVELOPMENT = env.NODE_ENV === 'development'
const PORT = env.PORT

const app = express()

async function applyDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

await applyDatabaseMigrations()

if (DEVELOPMENT) {
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  )
  app.use(viteDevServer.middlewares)
  app.use(async (req, res, next) => {
    try {
      const { default: serverEntry } =
        await viteDevServer.ssrLoadModule('./src/server.ts')
      const handler = toNodeHandler(serverEntry.fetch)
      await handler(req, res)
    } catch (error) {
      if (typeof error === 'object' && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error)
      }
      next(error)
    }
  })
} else {
  const { default: handler } = await import('./dist/server/server.js')
  const nodeHandler = toNodeHandler(handler.fetch)
  app.use('/', express.static('dist/client'))
  app.use(async (req, res, next) => {
    try {
      await nodeHandler(req, res)
    } catch (error) {
      next(error)
    }
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

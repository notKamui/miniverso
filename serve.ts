import express from 'express'
import { toNodeHandler } from 'srvx/node'
import type { ViteDevServer } from 'vite'
import { env } from '@/lib/env/server'

function isDevelopment() {
  return env.NODE_ENV === 'development'
}

type NodeHandler = ReturnType<typeof toNodeHandler>
type FetchHandler = Parameters<typeof toNodeHandler>[0]

async function runDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

function createDevNodeHandlerMiddleware(
  viteDevServer: ViteDevServer,
  toNodeHandler: (handler: FetchHandler) => NodeHandler,
): express.RequestHandler {
  return async (req, res, next) => {
    try {
      const server = await viteDevServer.ssrLoadModule('./src/server.ts')
      await toNodeHandler(server.default.fetch)(req, res)
    } catch (error) {
      if (typeof error === 'object' && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error)
      }
      next(error)
    }
  }
}

function createNodeHandlerMiddleware(
  nodeHandler: NodeHandler,
): express.RequestHandler {
  return async (req, res, next) => {
    try {
      await nodeHandler(req, res)
    } catch (error) {
      next(error)
    }
  }
}

async function setupDevelopment(app: express.Express) {
  const vite = await import('vite')
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
  })
  app.use(viteDevServer.middlewares)
  app.use(createDevNodeHandlerMiddleware(viteDevServer, toNodeHandler))
}

async function setupProduction(app: express.Express) {
  const server = await import('./dist/server/server.js')
  const nodeHandler = toNodeHandler(server.default.fetch)
  app.use('/', express.static('dist/client'))
  app.use(createNodeHandlerMiddleware(nodeHandler))
}

function startServer(app: express.Express, port: number) {
  app.listen(port, () => {
    const mode = isDevelopment() ? '[DEV]' : '[PROD]'
    console.log(`${mode}: Server is running on http://localhost:${port}`)
  })
}

await runDatabaseMigrations()

const app = express()

if (isDevelopment()) {
  await setupDevelopment(app)
} else {
  await setupProduction(app)
}

startServer(app, env.PORT)

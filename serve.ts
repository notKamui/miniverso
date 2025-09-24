import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import middie from '@fastify/middie'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { env } from '@/lib/env/server'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEVELOPMENT = env.NODE_ENV === 'development'
const PORT = env.PORT

async function applyDatabaseMigrations() {
  const { db } = await import('./src/server/db')
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

async function createViteMiddleware() {
  const { createServer } = await import('vite')

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  return vite
}

function convertRequest(fastifyRequest: any): Request {
  const url = new URL(
    fastifyRequest.url,
    `http://${fastifyRequest.headers.host}`,
  )

  const headers = new Headers()
  for (const [key, value] of Object.entries(fastifyRequest.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value)
    } else if (Array.isArray(value)) {
      for (const v of value) {
        headers.append(key, v)
      }
    }
  }

  const init: RequestInit = {
    method: fastifyRequest.method,
    headers,
  }

  if (
    fastifyRequest.body &&
    (fastifyRequest.method === 'POST' ||
      fastifyRequest.method === 'PUT' ||
      fastifyRequest.method === 'PATCH')
  ) {
    init.body = JSON.stringify(fastifyRequest.body)
  }

  return new Request(url.toString(), init)
}

async function convertResponse(response: Response, fastifyReply: any) {
  fastifyReply.status(response.status)

  response.headers.forEach((value, key) => {
    fastifyReply.header(key, value)
  })

  if (response.body) {
    const body = await response.arrayBuffer()
    return fastifyReply.send(Buffer.from(body))
  }

  return fastifyReply.send()
}

async function startDevelopmentServer() {
  const fastify = Fastify({
    logger: {
      level: 'warn',
    },
  })

  await fastify.register(middie)

  const vite = await createViteMiddleware()
  fastify.use(vite.middlewares)

  fastify.all('*', async (request, reply) => {
    try {
      const webRequest = convertRequest(request)

      const { default: serverEntry } =
        await vite.ssrLoadModule('./src/server.ts')
      const response = await serverEntry.fetch(webRequest)

      return convertResponse(response, reply)
    } catch (error) {
      fastify.log.error('SSR error:')
      fastify.log.error(error)
      reply.status(500).send('Internal Server Error')
    }
  })

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Development server is running on http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

async function startProductionServer() {
  const fastify = Fastify({
    logger: {
      level: 'warn',
    },
  })

  await fastify.register(fastifyStatic, {
    root: join(__dirname, 'dist/client'),
    prefix: '/',
    wildcard: false,
  })

  const { default: handler } = await import('./dist/server/server.js')

  fastify.setNotFoundHandler(async (request, reply) => {
    try {
      const webRequest = convertRequest(request)
      const response = await handler.fetch(webRequest)

      return convertResponse(response, reply)
    } catch (error) {
      fastify.log.error('Production server error:')
      fastify.log.error(error)
      reply.status(500).send('Internal Server Error')
    }
  })

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Production server is running on http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

async function main() {
  await applyDatabaseMigrations()

  if (DEVELOPMENT) {
    await startDevelopmentServer()
  } else {
    await startProductionServer()
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

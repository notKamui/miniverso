import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { badRequest } from '@/lib/utils/response'
import { $$auth } from '@/server/middlewares/auth'

export const $$admin = createMiddleware({ type: 'function' })
  .middleware([$$auth])
  .server(async ({ next, context: { user } }) => {
    if (user?.role !== 'admin') {
      badRequest('Admin access required', 403)
    }
    return next()
  })

export const $$adminApi = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return await next({ context: { user: session.user } })
  },
)

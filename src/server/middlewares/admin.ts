import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { badRequest } from '@/lib/utils/response'
import { adminApiGuard } from '@/server/middlewares/admin-guards'
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
    return await adminApiGuard({
      headers: request.headers,
      getSession: async (headers) => auth.api.getSession({ headers }),
      next,
    })
  },
)

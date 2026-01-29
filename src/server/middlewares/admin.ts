import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { badRequest } from '@/lib/utils/response'
import { adminApiGuard, adminFnGuard } from '@/server/middlewares/admin-guards'
import { $$auth } from '@/server/middlewares/auth'

export const $$admin = createMiddleware({ type: 'function' })
  .middleware([$$auth])
  .server(({ next, context: { user } }) =>
    adminFnGuard({
      user,
      next,
      deny: (message, status) => badRequest(message, status as any),
    }),
  )

export const $$adminApi = createMiddleware({ type: 'request' }).server(({ next }) =>
  adminApiGuard({
    headers: getRequestHeaders(),
    getSession: async (headers) => auth.api.getSession({ headers }),
    next,
  }),
)

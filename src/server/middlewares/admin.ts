import { createMiddleware } from '@tanstack/react-start'
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

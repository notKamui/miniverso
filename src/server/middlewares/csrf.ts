import { createMiddleware } from '@tanstack/react-start'
import { getRequestURL, isMethod } from '@tanstack/react-start/server'
import { env } from '@/lib/env/server'
import { badRequest } from '@/lib/utils/response'

export const $$csrf = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    if (env.DISABLE_CSRF) return await next()
    if (!isMethod(['POST', 'PUT', 'PATCH', 'DELETE'])) return await next()

    const origin = getRequestURL().origin
    if (!origin || !origin.startsWith(env.BASE_URL)) {
      badRequest('CSRF validation failed', 403)
    }
    return await next()
  },
)

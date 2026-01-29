import { createMiddleware } from '@tanstack/react-start'
import { getRequest, getRequestUrl } from '@tanstack/react-start/server'
import { env } from '@/lib/env/server'
import { badRequest } from '@/lib/utils/response'

export const $$cors = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  if (env.DISABLE_CORS) return await next()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(getRequest().method)) {
    return await next()
  }
  const origin = getRequestUrl().origin
  if (!origin || !origin.startsWith(env.BASE_URL)) {
    badRequest('CORS validation failed', 403)
  }
  return await next()
})

import { createMiddleware } from '@tanstack/react-start'
import { env } from '@/lib/env/server'
import { createTokenBucketManager } from '@/lib/utils/rate-limit'
import { badRequest } from '@/lib/utils/response'
import { $$auth } from '@/server/middlewares/auth'

const bucket = createTokenBucketManager<string>(30, 1)

export const $$rateLimit = createMiddleware({ type: 'function' })
  .middleware([$$auth])
  .server(async ({ next, context: { user } }) => {
    if (env.DISABLE_RATE_LIMIT) return await next()
    if (!bucket.consume(user.id, 1)) badRequest('Too many requests', 429)
    return await next()
  })

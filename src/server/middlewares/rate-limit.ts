import { env } from '@/lib/env/server'
import { checkIp } from '@/lib/utils/ip'
import { createTokenBucketManager } from '@/lib/utils/rate-limit'
import { badRequest } from '@/lib/utils/response'
import { createMiddleware } from '@tanstack/react-start'

const bucket = createTokenBucketManager<string>(30, 1)

export const $$rateLimit = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    if (env.DISABLE_RATE_LIMIT) return await next()
    const ip = checkIp()
    if (!bucket.consume(ip, 1)) badRequest('Too many requests', 429)
    return await next()
  },
)

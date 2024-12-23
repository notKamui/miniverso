import { env } from '@common/utils/env'
import { checkIp } from '@server/utils/ip'
import { createTokenBucketManager } from '@server/utils/rate-limit'
import { badRequest } from '@server/utils/response'
import { createMiddleware } from '@tanstack/start'

const bucket = createTokenBucketManager<string>(10, 2)

export const $$rateLimit = createMiddleware().server(async ({ next }) => {
  if (env.DISABLE_RATE_LIMIT) return await next()
  const ip = checkIp()
  if (!bucket.consume(ip, 1)) badRequest('Too many requests', 429)
  return await next()
})

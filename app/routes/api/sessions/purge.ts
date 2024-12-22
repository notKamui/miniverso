import { flatErrors } from '@app/utils/flat-errors'
import { env } from '@common/utils/env'
import { db } from '@server/db'
import { sessionsTable } from '@server/db/schema'
import { createTokenBucketManager } from '@server/utils/rate-limit'
import { badRequest } from '@server/utils/response'
import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { lt } from 'drizzle-orm'
import { getRequestIP } from 'vinxi/http'

const bucket = createTokenBucketManager<string>(10, 2)

export const APIRoute = createAPIFileRoute('/api/sessions/purge')({
  POST: async () =>
    await flatErrors(async () => {
      if (!env.DISABLE_RATE_LIMIT) {
        const ip = getRequestIP()
        if (!ip) badRequest('Suspicious request without IP address', 400)
        if (!bucket.consume(ip, 1)) badRequest('Too many requests', 429)
      }
      const deleted = await db
        .delete(sessionsTable)
        .where(lt(sessionsTable.expiresAt, new Date()))
        .returning()
      return json({ deleted: deleted.length })
    }),
})

import { flatErrors } from '@app/utils/flat-errors'
import { env } from '@common/utils/env'
import { db } from '@server/db'
import { sessionsTable } from '@server/db/schema'
import { checkIp } from '@server/utils/ip'
import { createTokenBucketManager } from '@server/utils/rate-limit'
import { badRequest } from '@server/utils/response'
import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { lt } from 'drizzle-orm'

const bucket = createTokenBucketManager<string>(10, 2)

export const APIRoute = createAPIFileRoute('/api/sessions/purge')({
  POST: async () =>
    await flatErrors(async () => {
      if (!env.DISABLE_RATE_LIMIT) {
        const ip = checkIp()
        if (!bucket.consume(ip, 1)) badRequest('Too many requests', 429)
      }
      const deleted = await db
        .delete(sessionsTable)
        .where(lt(sessionsTable.expiresAt, new Date()))
        .returning()
      return json({ deleted: deleted.length })
    }),
})

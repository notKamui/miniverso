import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { db } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { timeEntry } from '@/server/db/schema/time'
import { $$admin } from '@/server/middlewares/admin'

export type MiniversoExportV1 = {
  format: 'miniverso.export'
  version: 1
  exportedAt: string
  filters: {
    userEmail?: string
  }
  apps: {
    timeRecorder?: {
      timeEntries: Array<{
        sourceId: string
        userEmail: string
        startedAt: string
        endedAt: string | null
        description: string | null
      }>
    }
  }
}

const AdminExportV1Schema = z.object({
  apps: z
    .object({
      timeRecorder: z.boolean().default(true),
    })
    .default({ timeRecorder: true }),
  userEmail: z.email().optional(),
})

export const $adminExportV1 = createServerFn({ method: 'POST' })
  .middleware([$$admin])
  .inputValidator(validate(AdminExportV1Schema))
  .handler(async ({ data: { apps, userEmail } }) => {
    if (!apps.timeRecorder) {
      throw badRequest('Select at least one application to export', 400)
    }

    const exportDoc: MiniversoExportV1 = {
      format: 'miniverso.export',
      version: 1,
      exportedAt: new Date().toISOString(),
      filters: userEmail ? { userEmail } : {},
      apps: {},
    }

    if (apps.timeRecorder) {
      const query = db
        .select({
          id: timeEntry.id,
          startedAt: timeEntry.startedAt,
          endedAt: timeEntry.endedAt,
          description: timeEntry.description,
          userEmail: user.email,
        })
        .from(timeEntry)
        .innerJoin(user, eq(timeEntry.userId, user.id))
        .orderBy(asc(timeEntry.startedAt))

      const entries = userEmail
        ? await query.where(eq(user.email, userEmail))
        : await query

      exportDoc.apps.timeRecorder = {
        timeEntries: entries.map((e) => ({
          sourceId: e.id,
          userEmail: e.userEmail,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString() ?? null,
          description: e.description ?? null,
        })),
      }
    }

    return exportDoc
  })

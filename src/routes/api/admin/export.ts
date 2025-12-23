import { createFileRoute } from '@tanstack/react-router'
import { and, asc, eq, gt, or } from 'drizzle-orm'
import { z } from 'zod'
import type { Time } from '@/lib/utils/time'
import { db } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { timeEntry } from '@/server/db/schema/time'
import { $$adminApi } from '@/server/middlewares/admin'

const MAX_BUFFER_SIZE = 64000
const CHUNK_SIZE = 1000

const ExportQuerySchema = z.object({
  userEmail: z.email().trim().optional(),
  apps: z.array(z.string()).default([]),
})

type ExportMetaLineV1 = {
  type: 'meta'
  format: 'miniverso.export.ndjson'
  version: 1
  exportedAt: string
  filters: {
    userEmail?: string
  }
  apps: string[]
}

type TimeRecorderTimeEntryLineV1 = {
  type: 'timeRecorder.timeEntry'
  version: 1
  sourceId: string
  userEmail: string
  startedAt: string
  endedAt: string | null
  description: string | null
}

async function exportTimeRecorderNdjsonV1(args: {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  userEmail?: string
}) {
  const { controller, encoder, userEmail } = args

  let lastStartedAt: Time | null = null
  let lastId: string | null = null

  while (true) {
    const whereParts = [] as any[]
    if (userEmail) {
      whereParts.push(eq(user.email, userEmail))
    }

    if (lastStartedAt && lastId) {
      whereParts.push(
        or(
          gt(timeEntry.startedAt, lastStartedAt),
          and(eq(timeEntry.startedAt, lastStartedAt), gt(timeEntry.id, lastId)),
        ),
      )
    }

    const rows = await db
      .select({
        id: timeEntry.id,
        startedAt: timeEntry.startedAt,
        endedAt: timeEntry.endedAt,
        description: timeEntry.description,
        userEmail: user.email,
      })
      .from(timeEntry)
      .innerJoin(user, eq(timeEntry.userId, user.id))
      .where(whereParts.length ? and(...whereParts) : undefined)
      .orderBy(asc(timeEntry.startedAt), asc(timeEntry.id))
      .limit(CHUNK_SIZE)

    if (rows.length === 0) break

    let buffer = ''
    for (const row of rows) {
      const line: TimeRecorderTimeEntryLineV1 = {
        type: 'timeRecorder.timeEntry',
        version: 1,
        sourceId: row.id,
        userEmail: row.userEmail,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt?.toISOString() ?? null,
        description: row.description ?? null,
      }
      buffer += `${JSON.stringify(line)}\n`

      if (buffer.length > MAX_BUFFER_SIZE) {
        controller.enqueue(encoder.encode(buffer))
        buffer = ''
      }

      lastStartedAt = row.startedAt
      lastId = row.id
    }

    if (buffer.length) {
      controller.enqueue(encoder.encode(buffer))
    }
  }
}

export const Route = createFileRoute('/api/admin/export')({
  server: {
    middleware: [$$adminApi],
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const rawApps = url.searchParams
          .getAll('apps')
          .flatMap((v) => v.split(','))
          .map((v) => v.trim())
          .filter(Boolean)
        const parsed = ExportQuerySchema.safeParse({
          userEmail: url.searchParams.get('userEmail') ?? undefined,
          apps: rawApps,
        })

        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: parsed.error.issues[0]?.message ?? 'Invalid input',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        const apps = parsed.data.apps
        if (!apps.length) {
          return new Response(
            JSON.stringify({
              error: 'Select at least one application to export',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        const exportedAt = new Date().toISOString()
        const date = exportedAt.slice(0, 10)
        const scope = parsed.data.userEmail ? `-${parsed.data.userEmail}` : ''
        const filename = `miniverso-export-v1-${date}${scope}.ndjson`
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              const meta: ExportMetaLineV1 = {
                type: 'meta',
                format: 'miniverso.export.ndjson',
                version: 1,
                exportedAt,
                filters: parsed.data.userEmail
                  ? { userEmail: parsed.data.userEmail }
                  : {},
                apps,
              }
              controller.enqueue(encoder.encode(`${JSON.stringify(meta)}\n`))
              if (apps.includes('timeRecorder')) {
                await exportTimeRecorderNdjsonV1({
                  controller,
                  encoder,
                  userEmail: parsed.data.userEmail,
                })
              }
              controller.close()
            } catch (error) {
              console.error('[admin-export] streaming failed', {
                url: request.url,
                apps,
                userEmail: parsed.data.userEmail ?? null,
                exportedAt,
              })
              console.error(error)
              controller.error(error)
            }
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  },
})

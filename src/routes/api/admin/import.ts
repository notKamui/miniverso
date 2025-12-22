import { createFileRoute } from '@tanstack/react-router'
import { inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Time } from '@/lib/utils/time'
import { db } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { timeEntry } from '@/server/db/schema/time'
import { $$adminApi } from '@/server/middlewares/admin'

const ImportQuerySchema = z.object({
  apps: z.array(z.string()).default([]),
})

const MetaLineSchemaV1 = z
  .object({
    type: z.literal('meta'),
    format: z.literal('miniverso.export.ndjson'),
    version: z.literal(1),
  })
  .passthrough()

const TimeRecorderTimeEntryLineSchemaV1 = z
  .object({
    type: z.literal('timeRecorder.timeEntry'),
    version: z.literal(1),
    sourceId: z.string().min(1),
    userEmail: z.string().trim().email(),
    startedAt: z.string().min(1),
    endedAt: z.string().min(1).nullable(),
    description: z.string().nullable(),
  })
  .strict()

type TimeRecorderTimeEntryLineV1 = z.infer<
  typeof TimeRecorderTimeEntryLineSchemaV1
>

type ImportSummaryV1 = {
  ok: true
  version: 1
  apps: string[]
  processedLines: number
  importedTimeEntries: number
  skippedUnknownUser: number
}

async function* readNdjsonLines(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const newlineIndex = buffer.indexOf('\n')
      if (newlineIndex === -1) break
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      yield line
    }
  }

  buffer += decoder.decode()
  if (buffer.length) {
    yield buffer
  }
}

async function importTimeRecorderBatchV1(args: {
  rows: TimeRecorderTimeEntryLineV1[]
  userIdByEmail: Map<string, string | null>
}) {
  const { rows, userIdByEmail } = args

  const emailsToResolve = Array.from(
    new Set(
      rows.map((r) => r.userEmail).filter((email) => !userIdByEmail.has(email)),
    ),
  )

  if (emailsToResolve.length) {
    const users = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(inArray(user.email, emailsToResolve))

    for (const row of users) {
      userIdByEmail.set(row.email, row.id)
    }

    for (const email of emailsToResolve) {
      if (!userIdByEmail.has(email)) {
        userIdByEmail.set(email, null)
      }
    }
  }

  const values: (typeof timeEntry.$inferInsert)[] = []
  let skippedUnknownUser = 0

  for (const row of rows) {
    const userId = userIdByEmail.get(row.userEmail)
    if (!userId) {
      skippedUnknownUser++
      continue
    }

    values.push({
      id: row.sourceId,
      userId,
      startedAt: Time.from(row.startedAt),
      endedAt: row.endedAt ? Time.from(row.endedAt) : null,
      description: row.description,
    })
  }

  if (values.length) {
    await db
      .insert(timeEntry)
      .values(values)
      .onConflictDoUpdate({
        target: timeEntry.id,
        set: {
          userId: sql`excluded.user_id`,
          startedAt: sql`excluded.started_at`,
          endedAt: sql`excluded.ended_at`,
          description: sql`excluded.description`,
        },
      })
  }

  return { imported: values.length, skippedUnknownUser }
}

export const Route = createFileRoute('/api/admin/import')({
  server: {
    middleware: [$$adminApi],
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const rawApps = url.searchParams
          .getAll('apps')
          .flatMap((v) => v.split(','))
          .map((v) => v.trim())
          .filter(Boolean)
        const parsedQuery = ImportQuerySchema.safeParse({ apps: rawApps })
        if (!parsedQuery.success) {
          return new Response(
            JSON.stringify({
              error: parsedQuery.error.issues[0]?.message ?? 'Invalid input',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        const apps = parsedQuery.data.apps.length
          ? parsedQuery.data.apps
          : ['timeRecorder']
        const includeTimeRecorder = apps.includes('timeRecorder')
        if (!includeTimeRecorder) {
          return new Response(
            JSON.stringify({
              error: 'Select at least one application to import',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        if (!request.body) {
          return new Response(
            JSON.stringify({ error: 'Missing request body' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        const BATCH_SIZE = 1000
        const userIdByEmail = new Map<string, string | null>()
        let processedLines = 0
        let importedTimeEntries = 0
        let skippedUnknownUser = 0
        let sawMeta = false
        const bufferTimeEntries: TimeRecorderTimeEntryLineV1[] = []
        async function flushTimeRecorder() {
          if (bufferTimeEntries.length === 0) return
          const result = await importTimeRecorderBatchV1({
            rows: bufferTimeEntries,
            userIdByEmail,
          })
          importedTimeEntries += result.imported
          skippedUnknownUser += result.skippedUnknownUser
          bufferTimeEntries.length = 0
        }
        try {
          for await (const rawLine of readNdjsonLines(request.body)) {
            const line = rawLine.trim()
            if (!line) continue
            processedLines++
            let value: unknown
            try {
              value = JSON.parse(line)
            } catch {
              return new Response(
                JSON.stringify({
                  error: 'Invalid JSON line',
                  processedLines,
                }),
                {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' },
                },
              )
            }
            if (
              typeof value === 'object' &&
              value !== null &&
              'type' in value &&
              (value as any).type === 'meta'
            ) {
              const meta = MetaLineSchemaV1.safeParse(value)
              if (!meta.success) {
                return new Response(
                  JSON.stringify({
                    error:
                      meta.error.issues[0]?.message ?? 'Invalid meta header',
                  }),
                  {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                  },
                )
              }
              sawMeta = true
              continue
            }
            if (
              typeof value === 'object' &&
              value !== null &&
              'type' in value &&
              (value as any).type === 'timeRecorder.timeEntry'
            ) {
              if (!includeTimeRecorder) continue
              const parsedLine =
                TimeRecorderTimeEntryLineSchemaV1.safeParse(value)
              if (!parsedLine.success) {
                return new Response(
                  JSON.stringify({
                    error:
                      parsedLine.error.issues[0]?.message ??
                      'Invalid time entry line',
                    processedLines,
                  }),
                  {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                  },
                )
              }
              bufferTimeEntries.push(parsedLine.data)
              if (bufferTimeEntries.length >= BATCH_SIZE) {
                await flushTimeRecorder()
              }
            }
            // Unknown line type: ignore (forward-compatible)
          }
          await flushTimeRecorder()
          const summary: ImportSummaryV1 = {
            ok: true,
            version: 1,
            apps: includeTimeRecorder ? ['timeRecorder'] : [],
            processedLines,
            importedTimeEntries,
            skippedUnknownUser,
          }
          // If the file had no meta and no known records, return a helpful error.
          if (!sawMeta && processedLines === 0) {
            return new Response(
              JSON.stringify({ error: 'Empty import file' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }
          return new Response(JSON.stringify(summary), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Import failed',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})

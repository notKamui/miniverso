import { createFileRoute } from '@tanstack/react-router'
import { inArray } from 'drizzle-orm'
import * as z from 'zod'
import { Time } from '@/lib/utils/time'
import { buildConflictUpdateColumns, db } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { timeEntry } from '@/server/db/schema/time'
import { $$adminApi } from '@/server/middlewares/admin'

const BATCH_SIZE = 1000
const EMAIL_RESOLVE_BATCH_SIZE = 1000

const ImportQuerySchema = z.object({
  apps: z.array(z.string()).default([]),
})

const MetaLineSchemaV1 = z.looseObject({
  type: z.literal('meta'),
  format: z.literal('miniverso.export.ndjson'),
  version: z.literal(1),
})

const TimeRecorderTimeEntryLineSchemaV1 = z.strictObject({
  type: z.literal('timeRecorder.timeEntry'),
  version: z.literal(1),
  sourceId: z.string().min(1),
  userEmail: z.email().trim(),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1).nullable(),
  description: z.string().nullable(),
})

type TimeRecorderTimeEntryLineV1 = z.infer<typeof TimeRecorderTimeEntryLineSchemaV1>

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
  if (buffer.length > 0) {
    yield buffer
  }
}

async function importTimeRecorderBatchV1(args: {
  rows: TimeRecorderTimeEntryLineV1[]
  userIdByEmail: Map<string, string | null>
}) {
  const { rows, userIdByEmail } = args

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

  if (values.length > 0) {
    await db
      .insert(timeEntry)
      .values(values)
      .onConflictDoUpdate({
        target: timeEntry.id,
        set: buildConflictUpdateColumns(timeEntry, [
          'userId',
          'startedAt',
          'endedAt',
          'description',
        ]),
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
          return Response.json(
            { error: parsedQuery.error.issues[0]?.message ?? 'Invalid input' },
            { status: 400 },
          )
        }

        const apps = parsedQuery.data.apps.length > 0 ? parsedQuery.data.apps : ['timeRecorder']

        const includeTimeRecorder = apps.includes('timeRecorder')

        if (!includeTimeRecorder) {
          return Response.json(
            { error: 'Select at least one application to import' },
            { status: 400 },
          )
        }

        if (!request.body) {
          return Response.json({ error: 'Missing request body' }, { status: 400 })
        }

        const userIdByEmail = new Map<string, string | null>()
        const pendingEmails = new Set<string>()
        let processedLines = 0
        let importedTimeEntries = 0
        let skippedUnknownUser = 0
        let sawMeta = false

        const bufferTimeEntries: TimeRecorderTimeEntryLineV1[] = []

        async function resolvePendingEmails() {
          if (pendingEmails.size === 0) return

          const emailsToResolve = [...pendingEmails]
          pendingEmails.clear()

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

        async function flushTimeRecorder() {
          if (bufferTimeEntries.length === 0) return

          // Ensure every email seen in this batch is resolved (or marked unknown)
          // before attempting to upsert.
          await resolvePendingEmails()

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
              return Response.json({ error: 'Invalid JSON line', processedLines }, { status: 400 })
            }

            if (
              typeof value === 'object' &&
              value !== null &&
              'type' in value &&
              (value as any).type === 'meta'
            ) {
              const meta = MetaLineSchemaV1.safeParse(value)
              if (!meta.success) {
                return Response.json(
                  { error: meta.error.issues[0]?.message ?? 'Invalid meta header' },
                  { status: 400 },
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

              const parsedLine = TimeRecorderTimeEntryLineSchemaV1.safeParse(value)

              if (!parsedLine.success) {
                return Response.json(
                  {
                    error: parsedLine.error.issues[0]?.message ?? 'Invalid time entry line',
                    processedLines,
                  },
                  { status: 400 },
                )
              }

              bufferTimeEntries.push(parsedLine.data)

              if (!userIdByEmail.has(parsedLine.data.userEmail)) {
                pendingEmails.add(parsedLine.data.userEmail)
                if (pendingEmails.size >= EMAIL_RESOLVE_BATCH_SIZE) {
                  await resolvePendingEmails()
                }
              }

              if (bufferTimeEntries.length >= BATCH_SIZE) {
                await flushTimeRecorder()
              }
            }
            // Unknown line type: ignore (forward-compatible)
          }

          await resolvePendingEmails()
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
            return Response.json({ error: 'Empty import file' }, { status: 400 })
          }

          return Response.json(summary)
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})

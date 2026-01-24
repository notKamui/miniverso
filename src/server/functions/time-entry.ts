import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { Time, UTCTime } from '@/lib/utils/time'
import { tryAsync, tryInline } from '@/lib/utils/try'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { timeEntry, timeEntryTag } from '@/server/db/schema/time'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

function startedLocalExpr(tzOffsetMinutes: number) {
  return sql`(${timeEntry.startedAt} AT TIME ZONE 'UTC') - (${tzOffsetMinutes}::int * interval '1 minute')`
}

export const timeEntriesQueryKey = ['time-entries'] as const
export const timeStatsQueryKey = ['time-stats'] as const
export const timeEntryTagsQueryKey = ['time-entry-tags'] as const

export function getTimeEntriesByDayQueryOptions({
  dayKey,
  tzOffsetMinutes,
}: {
  dayKey: string
  tzOffsetMinutes: number
}) {
  return queryOptions({
    queryKey: [...timeEntriesQueryKey, { dayKey, tzOffsetMinutes }] as const,
    queryFn: ({ signal }) => $getTimeEntriesByDay({ signal, data: { dayKey, tzOffsetMinutes } }),
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function getTimeStatsQueryOptions({
  dayKey,
  type,
  tzOffsetMinutes,
}: {
  dayKey: string
  type: 'week' | 'month' | 'year'
  tzOffsetMinutes: number
}) {
  return queryOptions({
    queryKey: [...timeStatsQueryKey, { dayKey, type, tzOffsetMinutes }] as const,
    queryFn: ({ signal }) => $getTimeStatsBy({ signal, data: { dayKey, type, tzOffsetMinutes } }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export const $getTimeEntriesByDay = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(
    validate(
      z.object({
        dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tzOffsetMinutes: z.number().int().min(-840).max(840).default(0),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { dayKey, tzOffsetMinutes } }) => {
    const [error, range] = tryInline(() => UTCTime.localDayRange(dayKey, tzOffsetMinutes))

    if (error) {
      badRequest('Invalid dayKey', 400)
    }

    const { start: dayBegin, end: dayEnd } = range

    const entries = await db
      .select({
        id: timeEntry.id,
        userId: timeEntry.userId,
        startedAt: timeEntry.startedAt,
        endedAt: timeEntry.endedAt,
        description: timeEntry.description,
      })
      .from(timeEntry)
      .where(
        and(
          eq(timeEntry.userId, user.id),
          gte(timeEntry.startedAt, dayBegin),
          or(isNull(timeEntry.endedAt), lte(timeEntry.endedAt, dayEnd)),
        ),
      )

    return entries.toSorted((a, b) => b.startedAt.compare(a.startedAt))
  })

export const $getTimeStatsBy = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(
    validate(
      z.object({
        dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(['week', 'month', 'year']),
        tzOffsetMinutes: z.number().int().min(-840).max(840).default(0),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { dayKey, type, tzOffsetMinutes } }) => {
    const [error, range] = tryInline(() => UTCTime.localPeriodRange(dayKey, type, tzOffsetMinutes))

    if (error) {
      badRequest('Invalid dayKey', 400)
    }

    const { start: startDate, end: endDate } = range

    const groupBy = type === 'week' || type === 'month' ? 'day' : 'month'
    type GroupBy = typeof groupBy

    const startedLocal = startedLocalExpr(tzOffsetMinutes)

    const unitQuery = {
      day: sql<GroupBy>`DATE_TRUNC('day', ${startedLocal})`,
      month: sql<GroupBy>`DATE_TRUNC('month', ${startedLocal})`,
    }[groupBy]

    const dayOrMonthExpr = {
      week: sql`EXTRACT(ISODOW FROM ${startedLocal})`,
      month: sql`EXTRACT(DAY FROM ${startedLocal})`,
      year: sql`EXTRACT(MONTH FROM ${startedLocal})`,
    }[type]

    const dayOrMonthQuery = dayOrMonthExpr.mapWith(Number)

    const totalQuery = sql`SUM(EXTRACT(EPOCH FROM (${timeEntry.endedAt} - ${timeEntry.startedAt})))`

    return db
      .select({
        unit: unitQuery,
        dayOrMonth: dayOrMonthQuery,
        total: totalQuery.mapWith(Number),
      })
      .from(timeEntry)
      .where(
        and(
          eq(timeEntry.userId, user.id),
          isNotNull(timeEntry.endedAt),
          gte(timeEntry.startedAt, startDate),
          lte(timeEntry.endedAt, endDate),
        ),
      )
      .groupBy(sql`1`, sql`2`)
  })

export const $createTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ startedAt: Time.schema })))
  .handler(({ context: { user }, data: { startedAt } }) =>
    db
      .insert(timeEntry)
      .values({
        userId: user.id,
        startedAt,
      })
      .returning({
        id: timeEntry.id,
        userId: timeEntry.userId,
        startedAt: timeEntry.startedAt,
        endedAt: timeEntry.endedAt,
        description: timeEntry.description,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      ),
  )

export const $updateTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        id: z.string(),
        startedAt: Time.schema.optional(),
        endedAt: Time.schema.nullable().optional(),
        description: z.string().nullable().optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { id, startedAt, endedAt, description } }) => {
    const [error, entry] = await tryAsync(
      db.transaction(async (tx) => {
        const res = await tx
          .update(timeEntry)
          .set({
            startedAt,
            endedAt,
            description,
          })
          .where(and(eq(timeEntry.id, id), eq(timeEntry.userId, user.id)))
          .returning({
            id: timeEntry.id,
            userId: timeEntry.userId,
            startedAt: timeEntry.startedAt,
            endedAt: timeEntry.endedAt,
            description: timeEntry.description,
          })
          .then(takeUniqueOrNull)

        if (res && endedAt && endedAt.isBefore(res.startedAt)) {
          tx.rollback()
        }

        return res
      }),
    )

    if (error) throw badRequest('End date must be after start date', 400)
    if (!entry) throw notFound()

    return entry
  })

export const $deleteTimeEntries = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ ids: z.array(z.string()) })))
  .handler(async ({ context: { user }, data: { ids } }) => {
    const entry = await db
      .delete(timeEntry)
      .where(and(inArray(timeEntry.id, ids), eq(timeEntry.userId, user.id)))
      .returning({ id: timeEntry.id })

    if (!entry) throw notFound()

    return entry.map((e) => e.id)
  })

export function getTimeEntryTagsQueryOptions() {
  return queryOptions({
    queryKey: timeEntryTagsQueryKey,
    queryFn: ({ signal }) => $getTimeEntryTags({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const $getTimeEntryTags = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) => {
    const tags = await db
      .select({
        id: timeEntryTag.id,
        userId: timeEntryTag.userId,
        description: timeEntryTag.description,
      })
      .from(timeEntryTag)
      .where(eq(timeEntryTag.userId, user.id))
      .orderBy(timeEntryTag.description)

    return tags
  })

export const $createTimeEntryTag = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        description: z.string().min(1).max(2000),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { description } }) => {
    const existing = await db
      .select()
      .from(timeEntryTag)
      .where(
        and(eq(timeEntryTag.userId, user.id), eq(timeEntryTag.description, description.trim())),
      )
      .then(takeUniqueOrNull)

    if (existing) {
      return existing
    }

    const tag = await db
      .insert(timeEntryTag)
      .values({
        userId: user.id,
        description: description.trim(),
      })
      .returning({
        id: timeEntryTag.id,
        userId: timeEntryTag.userId,
        description: timeEntryTag.description,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    return tag
  })

export const $deleteTimeEntryTag = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.string() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const tag = await db
      .delete(timeEntryTag)
      .where(and(eq(timeEntryTag.id, id), eq(timeEntryTag.userId, user.id)))
      .returning({ id: timeEntryTag.id })
      .then(takeUniqueOrNull)

    if (!tag) throw notFound()

    return tag.id
  })

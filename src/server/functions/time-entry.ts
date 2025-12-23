import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import { badRequest } from '@/lib/utils/response'
import { Time } from '@/lib/utils/time'
import { tryAsync } from '@/lib/utils/try'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { timeEntry } from '@/server/db/schema/time'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

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
    const [y, m, d] = dayKey.split('-').map(Number)
    if (!y || !m || !d) {
      badRequest('Invalid dayKey', 400)
    }

    const offsetMs = tzOffsetMinutes * 60 * 1000
    const dayBegin = Time.from(
      new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) + offsetMs),
    )
    const dayEnd = Time.from(
      new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMs),
    )

    return db
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
  })

export const $getTimeStatsBy = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(
    validate(
      z.object({ date: Time.schema, type: z.enum(['week', 'month', 'year']) }),
    ),
  )
  .handler(async ({ context: { user }, data: { date, type } }) => {
    // for the given user
    // depending on the type given
    // get totals of time differences per units of time
    // for the given date.
    // ignore entries that are not ended
    // - week: get the totals per day of the week of the date
    // - month: get the totals per day of the month of the date
    // - year: get the totals per month of the year of the date

    const [startDate, endDate] = date.getRange(type)
    const groupBy = type === 'week' || type === 'month' ? 'day' : 'month'
    type GroupBy = typeof groupBy

    const unitQuery = {
      day: sql<GroupBy>`DATE_TRUNC('day', ${timeEntry.startedAt})`,
      month: sql<GroupBy>`DATE_TRUNC('month', ${timeEntry.startedAt})`,
    }[groupBy]

    const dayOrMonthQuery = {
      week: sql`EXTRACT(ISODOW FROM ${timeEntry.startedAt})`,
      month: sql`EXTRACT(DAY FROM ${timeEntry.startedAt})`,
      year: sql`EXTRACT(MONTH FROM ${timeEntry.startedAt})`,
    }[type]

    const totalQuery = sql`SUM(EXTRACT(EPOCH FROM (${timeEntry.endedAt} - ${timeEntry.startedAt})))`

    return db
      .select({
        unit: unitQuery,
        dayOrMonth: dayOrMonthQuery.mapWith(Number),
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
      .groupBy(({ unit, dayOrMonth }) => [unit, dayOrMonth])
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
  .handler(
    async ({
      context: { user },
      data: { id, startedAt, endedAt, description },
    }) => {
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
    },
  )

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

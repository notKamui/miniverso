import '@/global-middleware'
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
import { db, takeUniqueOrNull } from '@/server/db'
import { timeEntriesTable } from '@/server/db/schema'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const $getTimeEntriesByDay = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .validator(validate(z.object({ date: z.date() })))
  .handler(async ({ context: { user }, data: { date } }) => {
    const dayBegin = new Date(date)
    dayBegin.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const result = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, user.id),
          gte(timeEntriesTable.startedAt, dayBegin),
          or(
            isNull(timeEntriesTable.endedAt),
            lte(timeEntriesTable.endedAt, dayEnd),
          ),
        ),
      )

    return result
  })

export const $getTimeStatsBy = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .validator(
    validate(
      z.object({ date: z.date(), type: z.enum(['week', 'month', 'year']) }),
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

    const [startDate, endDate] = Time.from(date).getRange(type)
    const groupBy = type === 'week' || type === 'month' ? 'day' : 'month'

    const unitQuery = {
      day: sql<
        typeof groupBy
      >`DATE_TRUNC('day', ${timeEntriesTable.startedAt})`,
      month: sql<
        typeof groupBy
      >`DATE_TRUNC('month', ${timeEntriesTable.startedAt})`,
    }[groupBy]

    const dayOrMonthQuery = {
      week: sql`EXTRACT(ISODOW FROM ${timeEntriesTable.startedAt})`,
      month: sql`EXTRACT(DAY FROM ${timeEntriesTable.startedAt})`,
      year: sql`EXTRACT(MONTH FROM ${timeEntriesTable.startedAt})`,
    }[type].mapWith(Number)

    const result = await db
      .select({
        unit: unitQuery,
        total:
          sql`SUM(EXTRACT(EPOCH FROM (${timeEntriesTable.endedAt} - ${timeEntriesTable.startedAt})))`.mapWith(
            Number,
          ),
        dayOrMonth: dayOrMonthQuery,
      })
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, user.id),
          isNotNull(timeEntriesTable.endedAt),
          gte(timeEntriesTable.startedAt, startDate.getDate()),
          lte(timeEntriesTable.endedAt, endDate.getDate()),
        ),
      )
      .groupBy(({ unit, dayOrMonth }) => [unit, dayOrMonth])

    return result
  })

export const $createTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit, $$auth])
  .validator(validate(z.object({ startedAt: z.date() })))
  .handler(async ({ context: { user }, data: { startedAt } }) => {
    const timeEntry = await db
      .insert(timeEntriesTable)
      .values({
        userId: user.id,
        startedAt,
      })
      .returning()
      .then(takeUniqueOrNull)

    if (!timeEntry) throw notFound()

    return timeEntry
  })

export const $updateTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit, $$auth])
  .validator(
    validate(
      z.object({
        id: z.string(),
        startedAt: z.date().optional(),
        endedAt: z.date().nullable().optional(),
        description: z.string().nullable().optional(),
      }),
    ),
  )
  .handler(
    async ({
      context: { user },
      data: { id, startedAt, endedAt, description },
    }) => {
      const [error, timeEntry] = await tryAsync(
        db.transaction(async (tx) => {
          const res = await tx
            .update(timeEntriesTable)
            .set({ startedAt, endedAt, description })
            .where(
              and(
                eq(timeEntriesTable.id, id),
                eq(timeEntriesTable.userId, user.id),
              ),
            )
            .returning()
            .then(takeUniqueOrNull)

          if (res && endedAt && endedAt.getTime() < res.startedAt.getTime()) {
            tx.rollback()
          }

          return res
        }),
      )

      if (error) throw badRequest('End date must be after start date', 400)
      if (!timeEntry) throw notFound()

      return timeEntry
    },
  )

export const $deleteTimeEntries = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit, $$auth])
  .validator(validate(z.object({ ids: z.array(z.string()) })))
  .handler(async ({ context: { user }, data: { ids } }) => {
    const timeEntry = await db
      .delete(timeEntriesTable)
      .where(
        and(
          inArray(timeEntriesTable.id, ids),
          eq(timeEntriesTable.userId, user.id),
        ),
      )
      .returning({ id: timeEntriesTable.id })

    if (!timeEntry) throw notFound()

    return timeEntry.map((e) => e.id)
  })

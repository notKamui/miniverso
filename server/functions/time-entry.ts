import { Time } from '@common/utils/time'
import { tryAsync } from '@common/utils/try'
import { db, takeUniqueOrNull } from '@server/db'
import { timeEntriesTable } from '@server/db/schema'
import '@server/middlewares/global'
import { $$rateLimit } from '@server/middlewares/rate-limit'
import { $$session } from '@server/middlewares/session'
import { badRequest } from '@server/utils/response'
import { validate } from '@server/utils/validate'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'
import { and, eq, gte, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'

export const $getTimeEntriesByDay = createServerFn({ method: 'GET' })
  .middleware([$$session])
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
  .middleware([$$session])
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
      week: sql<number>`EXTRACT(ISODOW FROM ${timeEntriesTable.startedAt})`,
      month: sql<number>`EXTRACT(DAY FROM ${timeEntriesTable.startedAt})`,
      year: sql<number>`EXTRACT(MONTH FROM ${timeEntriesTable.startedAt})`,
    }[type]

    const result = await db
      .select({
        unit: unitQuery,
        total: sql<number>`SUM(EXTRACT(EPOCH FROM (${timeEntriesTable.endedAt} - ${timeEntriesTable.startedAt})))`,
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
  .middleware([$$rateLimit, $$session])
  .validator(validate(z.object({ startedAt: z.date().optional() })))
  .handler(async ({ context: { user }, data: { startedAt } }) => {
    const timeEntry = await db
      .insert(timeEntriesTable)
      .values({
        userId: user.id,
        startedAt: startedAt ?? new Date(),
      })
      .returning()
      .then(takeUniqueOrNull)

    if (!timeEntry) throw notFound()

    return timeEntry
  })

export const $updateTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit, $$session])
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

export const $deleteTimeEntry = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit, $$session])
  .validator(validate(z.object({ id: z.string() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const timeEntry = await db
      .delete(timeEntriesTable)
      .where(
        and(eq(timeEntriesTable.id, id), eq(timeEntriesTable.userId, user.id)),
      )
      .returning({ id: timeEntriesTable.id })
      .then(takeUniqueOrNull)

    if (!timeEntry) throw notFound()

    return timeEntry.id
  })

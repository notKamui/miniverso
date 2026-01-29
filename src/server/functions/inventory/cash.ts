import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { inventoryCash } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const inventoryCashQueryKey = ['inventory-cash'] as const

export function getCashQueryOptions() {
  return queryOptions({
    queryKey: inventoryCashQueryKey,
    queryFn: ({ signal }) => $getCash({ signal }),
    staleTime: 1000 * 60 * 2,
  })
}

export const $getCash = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) =>
    db
      .select({
        id: inventoryCash.id,
        userId: inventoryCash.userId,
        label: inventoryCash.label,
        value: inventoryCash.value,
        quantity: inventoryCash.quantity,
        sortOrder: inventoryCash.sortOrder,
      })
      .from(inventoryCash)
      .where(eq(inventoryCash.userId, user.id))
      .orderBy(asc(inventoryCash.sortOrder), asc(inventoryCash.id)),
  )

export const $createCash = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        label: z.string().min(1).max(100),
        value: z.number().min(0),
        quantity: z.number().int().min(0).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { label, value, quantity, sortOrder } }) => {
    let nextSort = sortOrder

    if (nextSort == null) {
      const rows = await db
        .select({ sortOrder: inventoryCash.sortOrder })
        .from(inventoryCash)
        .where(eq(inventoryCash.userId, user.id))
        .orderBy(desc(inventoryCash.sortOrder))
        .limit(1)
        .then(takeUniqueOrNull)

      nextSort = rows?.sortOrder != null ? Number(rows.sortOrder) + 1 : 0
    }

    return await db
      .insert(inventoryCash)
      .values({
        userId: user.id,
        label: label.trim(),
        value: String(Number(value).toFixed(2)),
        quantity: quantity ?? 0,
        sortOrder: nextSort,
      })
      .returning({
        id: inventoryCash.id,
        userId: inventoryCash.userId,
        label: inventoryCash.label,
        value: inventoryCash.value,
        quantity: inventoryCash.quantity,
        sortOrder: inventoryCash.sortOrder,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $updateCash = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        id: z.uuid(),
        label: z.string().min(1).max(100).optional(),
        value: z.number().min(0).optional(),
        quantity: z.number().int().min(0).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { id, label, value, quantity, sortOrder } }) => {
    const set: Record<string, unknown> = {}
    if (label !== undefined) set.label = label.trim()
    if (value !== undefined) set.value = String(Number(value).toFixed(2))
    if (quantity !== undefined) set.quantity = quantity
    if (sortOrder !== undefined) set.sortOrder = sortOrder

    if (Object.keys(set).length === 0) {
      return await db
        .select()
        .from(inventoryCash)
        .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )
    }

    return await db
      .update(inventoryCash)
      .set(set)
      .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
      .returning({
        id: inventoryCash.id,
        userId: inventoryCash.userId,
        label: inventoryCash.label,
        value: inventoryCash.value,
        quantity: inventoryCash.quantity,
        sortOrder: inventoryCash.sortOrder,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $reorderCashRow = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid(), direction: z.enum(['up', 'down']) })))
  .handler(async ({ context: { user }, data: { id, direction } }) => {
    const row = await db
      .select({ id: inventoryCash.id, sortOrder: inventoryCash.sortOrder })
      .from(inventoryCash)
      .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    const list = await db
      .select({ id: inventoryCash.id, sortOrder: inventoryCash.sortOrder })
      .from(inventoryCash)
      .where(eq(inventoryCash.userId, user.id))
      .orderBy(asc(inventoryCash.sortOrder), asc(inventoryCash.id))

    const i = list.findIndex((r) => r.id === id)
    if (i === -1) return
    const neighbourIdx = direction === 'up' ? i - 1 : i + 1
    if (neighbourIdx < 0 || neighbourIdx >= list.length) return

    const neighbour = list[neighbourIdx]
    const currSort = Number(row.sortOrder)
    const otherSort = Number(neighbour.sortOrder)

    await db.transaction(async (tx) => {
      await tx
        .update(inventoryCash)
        .set({ sortOrder: otherSort })
        .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
      await tx
        .update(inventoryCash)
        .set({ sortOrder: currSort })
        .where(and(eq(inventoryCash.id, neighbour.id), eq(inventoryCash.userId, user.id)))
    })
  })

export const $deleteCash = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(({ context: { user }, data: { id } }) =>
    db
      .delete(inventoryCash)
      .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
      .returning({ id: inventoryCash.id })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      ),
  )

import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOrNull } from '@/server/db'
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
  .handler(async ({ context: { user }, data }) => {
    const nextSort =
      data.sortOrder ??
      (await db
        .select({ sortOrder: inventoryCash.sortOrder })
        .from(inventoryCash)
        .where(eq(inventoryCash.userId, user.id))
        .orderBy(desc(inventoryCash.sortOrder))
        .limit(1)
        .then((rows) => (rows[0]?.sortOrder != null ? Number(rows[0].sortOrder) + 1 : 0)))

    const [row] = await db
      .insert(inventoryCash)
      .values({
        userId: user.id,
        label: data.label.trim(),
        value: String(Number(data.value).toFixed(2)),
        quantity: data.quantity ?? 0,
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
    if (!row) throw notFound()
    return row
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
  .handler(async ({ context: { user }, data }) => {
    const { id, ...rest } = data
    const set: Record<string, unknown> = {}
    if (rest.label !== undefined) set.label = rest.label.trim()
    if (rest.value !== undefined) set.value = String(Number(rest.value).toFixed(2))
    if (rest.quantity !== undefined) set.quantity = rest.quantity
    if (rest.sortOrder !== undefined) set.sortOrder = rest.sortOrder
    if (Object.keys(set).length === 0) {
      const row = await db
        .select()
        .from(inventoryCash)
        .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
        .then(takeUniqueOrNull)
      if (!row) throw notFound()
      return row
    }
    const row = await db
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
      .then(takeUniqueOrNull)
    if (!row) throw notFound()
    return row
  })

export const $deleteCash = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const row = await db
      .delete(inventoryCash)
      .where(and(eq(inventoryCash.id, id), eq(inventoryCash.userId, user.id)))
      .returning({ id: inventoryCash.id })
      .then(takeUniqueOrNull)
    if (!row) throw notFound()
    return row.id
  })

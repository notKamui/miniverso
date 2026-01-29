import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, like, sql } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { type DbOrTransaction, db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { inventoryOrderReferencePrefix, order } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const orderReferencePrefixesQueryKey = ['order-reference-prefixes'] as const

export function getOrderReferencePrefixesQueryOptions() {
  return queryOptions({
    queryKey: orderReferencePrefixesQueryKey,
    queryFn: ({ signal }) => $getOrderReferencePrefixes({ signal }),
    staleTime: 1000 * 60 * 5,
  })
}

export const $getOrderReferencePrefixes = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) =>
    db
      .select({
        id: inventoryOrderReferencePrefix.id,
        userId: inventoryOrderReferencePrefix.userId,
        prefix: inventoryOrderReferencePrefix.prefix,
      })
      .from(inventoryOrderReferencePrefix)
      .where(eq(inventoryOrderReferencePrefix.userId, user.id))
      .orderBy(asc(inventoryOrderReferencePrefix.prefix)),
  )

const prefixSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Prefix: alphanumeric, hyphen, underscore only')

export const $createOrderReferencePrefix = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ prefix: prefixSchema })))
  .handler(async ({ context: { user }, data: { prefix } }) => {
    const p = prefix.trim()
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(inventoryOrderReferencePrefix)
        .where(
          and(
            eq(inventoryOrderReferencePrefix.userId, user.id),
            eq(inventoryOrderReferencePrefix.prefix, p),
          ),
        )
        .then(takeUniqueOrNull)
      if (existing) badRequest('Prefix already exists', 400)

      return tx
        .insert(inventoryOrderReferencePrefix)
        .values({ userId: user.id, prefix: p })
        .returning({
          id: inventoryOrderReferencePrefix.id,
          userId: inventoryOrderReferencePrefix.userId,
          prefix: inventoryOrderReferencePrefix.prefix,
        })
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )
    })
  })

export const $updateOrderReferencePrefix = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid(), prefix: prefixSchema.optional() })))
  .handler(async ({ context: { user }, data: { id, prefix } }) => {
    const set: Record<string, unknown> = {}
    if (prefix !== undefined) set.prefix = prefix.trim()
    if (Object.keys(set).length === 0) {
      return await db
        .select()
        .from(inventoryOrderReferencePrefix)
        .where(
          and(
            eq(inventoryOrderReferencePrefix.id, id),
            eq(inventoryOrderReferencePrefix.userId, user.id),
          ),
        )
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )
    }
    return await db
      .update(inventoryOrderReferencePrefix)
      .set(set)
      .where(
        and(
          eq(inventoryOrderReferencePrefix.id, id),
          eq(inventoryOrderReferencePrefix.userId, user.id),
        ),
      )
      .returning({
        id: inventoryOrderReferencePrefix.id,
        userId: inventoryOrderReferencePrefix.userId,
        prefix: inventoryOrderReferencePrefix.prefix,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $deleteOrderReferencePrefix = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const all = await db
      .select({ id: inventoryOrderReferencePrefix.id })
      .from(inventoryOrderReferencePrefix)
      .where(eq(inventoryOrderReferencePrefix.userId, user.id))
    if (all.length <= 1)
      badRequest('Cannot delete the last prefix. At least one is required to create orders.', 400)

    const row = await db
      .delete(inventoryOrderReferencePrefix)
      .where(
        and(
          eq(inventoryOrderReferencePrefix.id, id),
          eq(inventoryOrderReferencePrefix.userId, user.id),
        ),
      )
      .returning({ id: inventoryOrderReferencePrefix.id })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    return row.id
  })

/**
 * Returns the next order reference for a prefix (e.g. "ORD-10" → "ORD-11").
 * Uses numeric ordering so "ORD-9" < "ORD-10". Use with db or a transaction.
 */
export async function getNextOrderReferenceForPrefix(
  dbOrTx: DbOrTransaction,
  userId: string,
  prefix: string,
): Promise<string> {
  const [last] = await dbOrTx
    .select({ reference: order.reference })
    .from(order)
    .where(and(eq(order.userId, userId), like(order.reference, `${prefix}-%`)))
    .orderBy(desc(sql`COALESCE((regexp_match(${order.reference}, '-([0-9]+)$'))[1]::int, 0)`))
    .limit(1)

  const n = last
    ? (() => {
        const parts = last.reference.split('-')
        const t = Number(parts.at(-1))
        return Number.isNaN(t) ? 0 : t
      })() + 1
    : 1

  return `${prefix}-${n}`
}

export const $getNextOrderReference = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(z.object({ prefixId: z.uuid() })))
  .handler(async ({ context: { user }, data: { prefixId } }) => {
    const p = await db
      .select({ prefix: inventoryOrderReferencePrefix.prefix })
      .from(inventoryOrderReferencePrefix)
      .where(
        and(
          eq(inventoryOrderReferencePrefix.id, prefixId),
          eq(inventoryOrderReferencePrefix.userId, user.id),
        ),
      )
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    return getNextOrderReferenceForPrefix(db, user.id, p.prefix)
  })

import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr } from '@/server/db'
import { orderPriceModificationPreset } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const orderPriceModificationPresetsQueryKey = ['order-price-modification-presets'] as const

export function getOrderPriceModificationPresetsQueryOptions() {
  return queryOptions({
    queryKey: orderPriceModificationPresetsQueryKey,
    queryFn: ({ signal }) => $getOrderPriceModificationPresets({ signal }),
    staleTime: 1000 * 60 * 5,
  })
}

export const $getOrderPriceModificationPresets = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) =>
    db
      .select({
        id: orderPriceModificationPreset.id,
        userId: orderPriceModificationPreset.userId,
        name: orderPriceModificationPreset.name,
        type: orderPriceModificationPreset.type,
        kind: orderPriceModificationPreset.kind,
        value: orderPriceModificationPreset.value,
        sortOrder: orderPriceModificationPreset.sortOrder,
      })
      .from(orderPriceModificationPreset)
      .where(eq(orderPriceModificationPreset.userId, user.id))
      .orderBy(asc(orderPriceModificationPreset.sortOrder), asc(orderPriceModificationPreset.name)),
  )

const presetSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['increase', 'decrease']),
  kind: z.enum(['flat', 'relative']),
  value: z.number().positive(),
})

export const $createOrderPriceModificationPreset = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(presetSchema))
  .handler(async ({ context: { user }, data }) => {
    return db
      .insert(orderPriceModificationPreset)
      .values({
        userId: user.id,
        name: data.name.trim(),
        type: data.type,
        kind: data.kind,
        value: String(Number(data.value).toFixed(2)),
      })
      .returning({
        id: orderPriceModificationPreset.id,
        userId: orderPriceModificationPreset.userId,
        name: orderPriceModificationPreset.name,
        type: orderPriceModificationPreset.type,
        kind: orderPriceModificationPreset.kind,
        value: orderPriceModificationPreset.value,
        sortOrder: orderPriceModificationPreset.sortOrder,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

const updatePresetSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['increase', 'decrease']).optional(),
  kind: z.enum(['flat', 'relative']).optional(),
  value: z.number().positive().optional(),
})

export const $updateOrderPriceModificationPreset = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(updatePresetSchema))
  .handler(async ({ context: { user }, data: { id, ...rest } }) => {
    const set: Record<string, unknown> = {}
    if (rest.name !== undefined) set.name = rest.name.trim()
    if (rest.type !== undefined) set.type = rest.type
    if (rest.kind !== undefined) set.kind = rest.kind
    if (rest.value !== undefined) set.value = String(Number(rest.value).toFixed(2))
    if (Object.keys(set).length === 0) {
      return await db
        .select()
        .from(orderPriceModificationPreset)
        .where(
          and(
            eq(orderPriceModificationPreset.id, id),
            eq(orderPriceModificationPreset.userId, user.id),
          ),
        )
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )
    }
    return await db
      .update(orderPriceModificationPreset)
      .set(set)
      .where(
        and(
          eq(orderPriceModificationPreset.id, id),
          eq(orderPriceModificationPreset.userId, user.id),
        ),
      )
      .returning({
        id: orderPriceModificationPreset.id,
        userId: orderPriceModificationPreset.userId,
        name: orderPriceModificationPreset.name,
        type: orderPriceModificationPreset.type,
        kind: orderPriceModificationPreset.kind,
        value: orderPriceModificationPreset.value,
        sortOrder: orderPriceModificationPreset.sortOrder,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $deleteOrderPriceModificationPreset = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const row = await db
      .delete(orderPriceModificationPreset)
      .where(
        and(
          eq(orderPriceModificationPreset.id, id),
          eq(orderPriceModificationPreset.userId, user.id),
        ),
      )
      .returning({ id: orderPriceModificationPreset.id })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
    return row.id
  })

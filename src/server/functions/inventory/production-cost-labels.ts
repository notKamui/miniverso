import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { inventoryProductionCostLabel } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const productionCostLabelsQueryKey = ['production-cost-labels'] as const

export function getProductionCostLabelsQueryOptions() {
  return queryOptions({
    queryKey: productionCostLabelsQueryKey,
    queryFn: ({ signal }) => $getProductionCostLabels({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const $getProductionCostLabels = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) => {
    return db
      .select({
        id: inventoryProductionCostLabel.id,
        userId: inventoryProductionCostLabel.userId,
        name: inventoryProductionCostLabel.name,
        color: inventoryProductionCostLabel.color,
      })
      .from(inventoryProductionCostLabel)
      .where(eq(inventoryProductionCostLabel.userId, user.id))
      .orderBy(asc(inventoryProductionCostLabel.name))
  })

export const $createProductionCostLabel = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        name: z.string().min(1).max(500),
        color: z.string().min(1).max(20),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { name, color } }) => {
    const existing = await db
      .select()
      .from(inventoryProductionCostLabel)
      .where(
        and(
          eq(inventoryProductionCostLabel.userId, user.id),
          eq(inventoryProductionCostLabel.name, name.trim()),
        ),
      )
      .then(takeUniqueOrNull)

    if (existing) return existing

    return db
      .insert(inventoryProductionCostLabel)
      .values({
        userId: user.id,
        name: name.trim(),
        color: color.trim(),
      })
      .returning({
        id: inventoryProductionCostLabel.id,
        userId: inventoryProductionCostLabel.userId,
        name: inventoryProductionCostLabel.name,
        color: inventoryProductionCostLabel.color,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $updateProductionCostLabel = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).max(500).optional(),
        color: z.string().min(1).max(20).optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { id, name, color } }) =>
    db
      .update(inventoryProductionCostLabel)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color: color.trim() }),
      })
      .where(
        and(
          eq(inventoryProductionCostLabel.id, id),
          eq(inventoryProductionCostLabel.userId, user.id),
        ),
      )
      .returning({
        id: inventoryProductionCostLabel.id,
        userId: inventoryProductionCostLabel.userId,
        name: inventoryProductionCostLabel.name,
        color: inventoryProductionCostLabel.color,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      ),
  )

export const $deleteProductionCostLabel = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const label = await db
      .delete(inventoryProductionCostLabel)
      .where(
        and(
          eq(inventoryProductionCostLabel.id, id),
          eq(inventoryProductionCostLabel.userId, user.id),
        ),
      )
      .returning({ id: inventoryProductionCostLabel.id })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    return label.id
  })

import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import { inventoryTag } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const inventoryTagsQueryKey = ['inventory-tags'] as const

export function getInventoryTagsQueryOptions() {
  return queryOptions({
    queryKey: inventoryTagsQueryKey,
    queryFn: ({ signal }) => $getInventoryTags({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const $getInventoryTags = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) => {
    return db
      .select({
        id: inventoryTag.id,
        userId: inventoryTag.userId,
        name: inventoryTag.name,
        color: inventoryTag.color,
      })
      .from(inventoryTag)
      .where(eq(inventoryTag.userId, user.id))
      .orderBy(asc(inventoryTag.name))
  })

export const $createInventoryTag = createServerFn({ method: 'POST' })
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
      .from(inventoryTag)
      .where(and(eq(inventoryTag.userId, user.id), eq(inventoryTag.name, name.trim())))
      .then(takeUniqueOrNull)

    if (existing) return existing

    return db
      .insert(inventoryTag)
      .values({
        userId: user.id,
        name: name.trim(),
        color: color.trim(),
      })
      .returning({
        id: inventoryTag.id,
        userId: inventoryTag.userId,
        name: inventoryTag.name,
        color: inventoryTag.color,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $updateInventoryTag = createServerFn({ method: 'POST' })
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
  .handler(async ({ context: { user }, data: { id, name, color } }) => {
    const tag = await db
      .update(inventoryTag)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color: color.trim() }),
      })
      .where(and(eq(inventoryTag.id, id), eq(inventoryTag.userId, user.id)))
      .returning({
        id: inventoryTag.id,
        userId: inventoryTag.userId,
        name: inventoryTag.name,
        color: inventoryTag.color,
      })
      .then(takeUniqueOrNull)

    if (!tag) throw notFound()
    return tag
  })

export const $deleteInventoryTag = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const tag = await db
      .delete(inventoryTag)
      .where(and(eq(inventoryTag.id, id), eq(inventoryTag.userId, user.id)))
      .returning({ id: inventoryTag.id })
      .then(takeUniqueOrNull)

    if (!tag) throw notFound()
    return tag.id
  })

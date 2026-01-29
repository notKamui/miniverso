import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOrNull } from '@/server/db'
import { inventorySetting } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export const inventoryCurrencyQueryKey = ['inventory-currency'] as const

export function getInventoryCurrencyQueryOptions() {
  return queryOptions({
    queryKey: inventoryCurrencyQueryKey,
    queryFn: ({ signal }) => $getInventoryCurrency({ signal }),
    staleTime: 1000 * 60 * 2,
  })
}

export const $getInventoryCurrency = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .handler(async ({ context: { user } }) => {
    const row = await db
      .select({ value: inventorySetting.value })
      .from(inventorySetting)
      .where(and(eq(inventorySetting.userId, user.id), eq(inventorySetting.key, 'currency')))
      .then(takeUniqueOrNull)
    return row?.value ?? 'EUR'
  })

export const $setInventoryCurrency = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ currency: z.string().min(1).max(10) })))
  .handler(async ({ context: { user }, data }) => {
    await db
      .insert(inventorySetting)
      .values({
        userId: user.id,
        key: 'currency',
        value: data.currency.trim(),
      })
      .onConflictDoUpdate({
        target: [inventorySetting.userId, inventorySetting.key],
        set: { value: data.currency.trim() },
      })
  })

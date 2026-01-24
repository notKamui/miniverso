import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  ilike,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { db, paginated, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import {
  inventoryOrderReferencePrefix,
  inventoryProductionCostLabel,
  inventoryTag,
  order,
  orderItem,
  product,
  productProductionCost,
  productTag,
} from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'

export function priceTaxIncluded(
  priceTaxFree: number | string,
  vatPercent: number | string,
): number {
  const p = typeof priceTaxFree === 'string' ? Number(priceTaxFree) : priceTaxFree
  const v = typeof vatPercent === 'string' ? Number(vatPercent) : vatPercent
  return p * (1 + v / 100)
}

export function productUnitProductionCost(rows: { amount: number | string }[]): number {
  return rows.reduce(
    (sum, r) => sum + (typeof r.amount === 'string' ? Number(r.amount) : r.amount),
    0,
  )
}

export const inventoryTagsQueryKey = ['inventory-tags'] as const
export const productionCostLabelsQueryKey = ['production-cost-labels'] as const

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
  .handler(async ({ context: { user }, data: { id, name, color } }) => {
    const label = await db
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
      .then(takeUniqueOrNull)

    if (!label) throw notFound()
    return label
  })

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
      .then(takeUniqueOrNull)

    if (!label) throw notFound()
    return label.id
  })

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
        sortOrder: inventoryOrderReferencePrefix.sortOrder,
      })
      .from(inventoryOrderReferencePrefix)
      .where(eq(inventoryOrderReferencePrefix.userId, user.id))
      .orderBy(
        asc(inventoryOrderReferencePrefix.sortOrder),
        asc(inventoryOrderReferencePrefix.prefix),
      ),
  )

const prefixSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Prefix: alphanumeric, hyphen, underscore only')

export const $createOrderReferencePrefix = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        prefix: prefixSchema,
        sortOrder: z.number().int().min(0).optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { prefix, sortOrder } }) => {
    const p = prefix.trim()
    const existing = await db
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

    return db
      .insert(inventoryOrderReferencePrefix)
      .values({ userId: user.id, prefix: p, sortOrder: sortOrder ?? 0 })
      .returning({
        id: inventoryOrderReferencePrefix.id,
        userId: inventoryOrderReferencePrefix.userId,
        prefix: inventoryOrderReferencePrefix.prefix,
        sortOrder: inventoryOrderReferencePrefix.sortOrder,
      })
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
  })

export const $updateOrderReferencePrefix = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(
    validate(
      z.object({
        id: z.uuid(),
        prefix: prefixSchema.optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { id, prefix, sortOrder } }) => {
    const set: Record<string, unknown> = {}
    if (prefix !== undefined) set.prefix = prefix.trim()
    if (sortOrder !== undefined) set.sortOrder = sortOrder
    if (Object.keys(set).length === 0) {
      const row = await db
        .select()
        .from(inventoryOrderReferencePrefix)
        .where(
          and(
            eq(inventoryOrderReferencePrefix.id, id),
            eq(inventoryOrderReferencePrefix.userId, user.id),
          ),
        )
        .then(takeUniqueOrNull)
      if (!row) throw notFound()
      return row
    }
    const row = await db
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
        sortOrder: inventoryOrderReferencePrefix.sortOrder,
      })
      .then(takeUniqueOrNull)
    if (!row) throw notFound()
    return row
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
      .then(takeUniqueOrNull)
    if (!row) throw notFound()
    return row.id
  })

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
      .then(takeUniqueOrNull)
    if (!p) throw notFound()

    const [last] = await db
      .select({ reference: order.reference })
      .from(order)
      .where(and(eq(order.userId, user.id), like(order.reference, `${p.prefix}-%`)))
      .orderBy(desc(order.reference))
      .limit(1)

    const n = last
      ? (() => {
          const parts = last.reference.split('-')
          const t = Number(parts.at(-1))
          return Number.isNaN(t) ? 0 : t
        })() + 1
      : 1

    return `${p.prefix}-${n}`
  })

export const productsQueryKey = ['products'] as const

const productListFields = {
  id: product.id,
  userId: product.userId,
  name: product.name,
  description: product.description,
  sku: product.sku,
  priceTaxFree: product.priceTaxFree,
  vatPercent: product.vatPercent,
  quantity: product.quantity,
  archivedAt: product.archivedAt,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
} as const

const getProductsSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(500).optional(),
  archived: z.enum(['all', 'active', 'archived']).default('all'),
})

export function getProductsQueryOptions(params: z.infer<typeof getProductsSchema>) {
  return queryOptions({
    queryKey: [...productsQueryKey, params] as const,
    queryFn: ({ signal }) => $getProducts({ signal, data: params }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export const $getProducts = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(getProductsSchema))
  .handler(async ({ context: { user }, data: { page, size, search, archived } }) => {
    const conditions: Parameters<typeof and>[0][] = [eq(product.userId, user.id)]
    if (search) {
      const pattern = search.replaceAll(/[%_]/g, String.raw`\$&`)
      conditions.push(or(ilike(product.name, `%${pattern}%`), ilike(product.sku, `%${pattern}%`)))
    }
    if (archived === 'active') conditions.push(isNull(product.archivedAt))
    else if (archived === 'archived') conditions.push(isNotNull(product.archivedAt))

    return paginated({
      table: product,
      where: and(...conditions),
      orderBy: asc(product.name),
      page,
      size,
    })
  })

export function getProductQueryOptions(productId: string) {
  return queryOptions({
    queryKey: [...productsQueryKey, productId] as const,
    queryFn: ({ signal }) => $getProduct({ signal, data: { productId } }),
    staleTime: 1000 * 30,
  })
}

export const $getProduct = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(z.object({ productId: z.uuid() })))
  .handler(async ({ context: { user }, data: { productId } }) => {
    const p = await db
      .select(productListFields)
      .from(product)
      .where(and(eq(product.id, productId), eq(product.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!p) throw notFound()

    const tags = await db
      .select({ id: inventoryTag.id, name: inventoryTag.name, color: inventoryTag.color })
      .from(productTag)
      .innerJoin(inventoryTag, eq(productTag.tagId, inventoryTag.id))
      .where(eq(productTag.productId, productId))

    const costs = await db
      .select({
        labelId: inventoryProductionCostLabel.id,
        labelName: inventoryProductionCostLabel.name,
        labelColor: inventoryProductionCostLabel.color,
        amount: productProductionCost.amount,
      })
      .from(productProductionCost)
      .innerJoin(
        inventoryProductionCostLabel,
        eq(productProductionCost.productionCostLabelId, inventoryProductionCostLabel.id),
      )
      .where(eq(productProductionCost.productId, productId))

    return { product: p, tags, productionCosts: costs }
  })

const productCreateSchema = z.object({
  name: z.string().min(1).max(2000),
  description: z.string().max(10_000).optional(),
  sku: z.string().min(1).max(200),
  priceTaxFree: z.number().min(0),
  vatPercent: z.number().min(0).max(100),
  quantity: z.number().int().min(0),
  tagIds: z.array(z.uuid()).default([]),
  productionCosts: z.array(z.object({ labelId: z.uuid(), amount: z.number().min(0) })).default([]),
})

export const $createProduct = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(productCreateSchema))
  .handler(async ({ context: { user }, data }) => {
    if (data.tagIds.length > 0) {
      const tags = await db
        .select({ id: inventoryTag.id })
        .from(inventoryTag)
        .where(and(eq(inventoryTag.userId, user.id), inArray(inventoryTag.id, data.tagIds)))
      if (tags.length !== data.tagIds.length) badRequest('Invalid tagIds', 400)
    }
    const labelIds = [...new Set(data.productionCosts.map((c) => c.labelId))]
    if (labelIds.length > 0) {
      const labels = await db
        .select({ id: inventoryProductionCostLabel.id })
        .from(inventoryProductionCostLabel)
        .where(
          and(
            eq(inventoryProductionCostLabel.userId, user.id),
            inArray(inventoryProductionCostLabel.id, labelIds),
          ),
        )
      if (labels.length !== labelIds.length) badRequest('Invalid production cost labelIds', 400)
    }

    const [p] = await db
      .insert(product)
      .values({
        userId: user.id,
        name: data.name,
        description: data.description ?? null,
        sku: data.sku,
        priceTaxFree: String(data.priceTaxFree.toFixed(2)),
        vatPercent: String(data.vatPercent.toFixed(2)),
        quantity: data.quantity,
      })
      .returning(productListFields)

    if (!p) throw notFound()

    if (data.tagIds.length > 0) {
      await db.insert(productTag).values(data.tagIds.map((tagId) => ({ productId: p.id, tagId })))
    }
    if (data.productionCosts.length > 0) {
      await db.insert(productProductionCost).values(
        data.productionCosts.map((c) => ({
          productId: p.id,
          productionCostLabelId: c.labelId,
          amount: String(c.amount.toFixed(2)),
        })),
      )
    }

    return p
  })

const productUpdateSchema = productCreateSchema.partial().extend({
  id: z.uuid(),
  archivedAt: z.boolean().optional(),
})

export const $updateProduct = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(productUpdateSchema))
  .handler(async ({ context: { user }, data }) => {
    const { id, ...rest } = data
    const tagIds = rest.tagIds
    const productionCosts = rest.productionCosts
    const archivedAt = rest.archivedAt
    delete (rest as Record<string, unknown>).tagIds
    delete (rest as Record<string, unknown>).productionCosts
    delete (rest as Record<string, unknown>).archivedAt

    const existing = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.id, id), eq(product.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!existing) throw notFound()

    const set: Record<string, unknown> = {}
    if (rest.name !== undefined) set.name = rest.name
    if (rest.description !== undefined) set.description = rest.description
    if (rest.sku !== undefined) set.sku = rest.sku
    if (rest.priceTaxFree !== undefined) set.priceTaxFree = String(rest.priceTaxFree.toFixed(2))
    if (rest.vatPercent !== undefined) set.vatPercent = String(rest.vatPercent.toFixed(2))
    if (rest.quantity !== undefined) {
      if (rest.quantity < 0) badRequest('quantity must be >= 0', 400)
      set.quantity = rest.quantity
    }
    if (archivedAt !== undefined) {
      set.archivedAt = archivedAt ? new Date() : null
    }

    if (Object.keys(set).length > 0) {
      await db
        .update(product)
        .set(set)
        .where(and(eq(product.id, id), eq(product.userId, user.id)))
    }

    if (tagIds !== undefined) {
      await db.delete(productTag).where(eq(productTag.productId, id))
      if (tagIds.length > 0) {
        const tags = await db
          .select({ id: inventoryTag.id })
          .from(inventoryTag)
          .where(and(eq(inventoryTag.userId, user.id), inArray(inventoryTag.id, tagIds)))
        if (tags.length !== tagIds.length) badRequest('Invalid tagIds', 400)
        await db.insert(productTag).values(tagIds.map((tagId) => ({ productId: id, tagId })))
      }
    }
    if (productionCosts !== undefined) {
      await db.delete(productProductionCost).where(eq(productProductionCost.productId, id))
      if (productionCosts.length > 0) {
        const labelIds = [...new Set(productionCosts.map((c) => c.labelId))]
        const labels = await db
          .select({ id: inventoryProductionCostLabel.id })
          .from(inventoryProductionCostLabel)
          .where(
            and(
              eq(inventoryProductionCostLabel.userId, user.id),
              inArray(inventoryProductionCostLabel.id, labelIds),
            ),
          )
        if (labels.length !== labelIds.length) badRequest('Invalid production cost labelIds', 400)
        await db.insert(productProductionCost).values(
          productionCosts.map((c) => ({
            productId: id,
            productionCostLabelId: c.labelId,
            amount: String(c.amount.toFixed(2)),
          })),
        )
      }
    }

    const out = await db
      .select(productListFields)
      .from(product)
      .where(and(eq(product.id, id), eq(product.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!out) throw notFound()
    return out
  })

export const $deleteProduct = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ id: z.uuid() })))
  .handler(async ({ context: { user }, data: { id } }) => {
    const row = await db
      .delete(product)
      .where(and(eq(product.id, id), eq(product.userId, user.id)))
      .returning({ id: product.id })
      .then(takeUniqueOrNull)
    if (!row) throw notFound()
    return row.id
  })

export const ordersQueryKey = ['orders'] as const

const orderListFields = {
  id: order.id,
  userId: order.userId,
  reference: order.reference,
  status: order.status,
  description: order.description,
  createdAt: order.createdAt,
  paidAt: order.paidAt,
} as const

const getOrdersSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  reference: z.string().trim().min(1).max(500).optional(),
  startDate: z.string().min(1).max(50).optional(),
  endDate: z.string().min(1).max(50).optional(),
})

export function getOrdersQueryOptions(params: z.input<typeof getOrdersSchema> = {}) {
  const data = {
    page: params.page ?? 1,
    size: params.size ?? 20,
    reference: params.reference,
    startDate: params.startDate,
    endDate: params.endDate,
  }
  return queryOptions({
    queryKey: [...ordersQueryKey, params] as const,
    queryFn: ({ signal }) => $getOrders({ signal, data }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

export const $getOrders = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(getOrdersSchema))
  .handler(async ({ context: { user }, data: { page, size, reference, startDate, endDate } }) => {
    const conditions: Parameters<typeof and>[0][] = [eq(order.userId, user.id)]
    if (reference) {
      const pattern = reference.replaceAll(/[%_]/g, String.raw`\$&`)
      conditions.push(ilike(order.reference, `%${pattern}%`))
    }
    if (startDate) conditions.push(gte(order.createdAt, new Date(startDate)))
    if (endDate) {
      const d = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999Z`) : new Date(endDate)
      conditions.push(lte(order.createdAt, d))
    }
    const where = and(...conditions)

    const [totalRes, idRows] = await Promise.all([
      db.select({ total: count() }).from(order).where(where),
      db
        .select({ id: order.id })
        .from(order)
        .where(where)
        .orderBy(desc(order.createdAt))
        .limit(size)
        .offset((page - 1) * size),
    ])

    const total = totalRes[0]?.total ?? 0
    const ids = idRows.map((r) => r.id)
    if (ids.length === 0) {
      return {
        items: [],
        total: Number(total),
        page,
        size,
        totalPages: Math.max(1, Math.ceil(Number(total) / size)),
      }
    }

    const [ordersRows, totalsRows] = await Promise.all([
      db.select(orderListFields).from(order).where(inArray(order.id, ids)),
      db
        .select({
          orderId: orderItem.orderId,
          totalTaxIncluded: sql<string>`SUM(${orderItem.quantity} * ${orderItem.unitPriceTaxIncluded})`,
        })
        .from(orderItem)
        .where(inArray(orderItem.orderId, ids))
        .groupBy(orderItem.orderId),
    ])

    const orderById = new Map(ordersRows.map((o) => [o.id, o]))
    const totalByOrder = new Map(totalsRows.map((t) => [t.orderId, Number(t.totalTaxIncluded)]))
    const items = ids
      .map((id) => orderById.get(id))
      .filter(Boolean)
      .map((o) => ({ ...o!, totalTaxIncluded: totalByOrder.get(o!.id) ?? 0 }))

    return {
      items,
      total: Number(total),
      page,
      size,
      totalPages: Math.max(1, Math.ceil(Number(total) / size)),
    }
  })

export function getOrderQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: [...ordersQueryKey, orderId] as const,
    queryFn: ({ signal }) => $getOrder({ signal, data: { orderId } }),
    staleTime: 1000 * 30,
  })
}

export const $getOrder = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(z.object({ orderId: z.uuid() })))
  .handler(async ({ context: { user }, data: { orderId } }) => {
    const o = await db
      .select(orderListFields)
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!o) throw notFound()

    const items = await db
      .select({
        id: orderItem.id,
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        unitPriceTaxFree: orderItem.unitPriceTaxFree,
        unitPriceTaxIncluded: orderItem.unitPriceTaxIncluded,
        productName: product.name,
      })
      .from(orderItem)
      .leftJoin(product, eq(orderItem.productId, product.id))
      .where(eq(orderItem.orderId, orderId))

    const totalTaxFree = items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.unitPriceTaxFree),
      0,
    )
    const totalTaxIncluded = items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.unitPriceTaxIncluded),
      0,
    )

    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))] as string[]
    let totalBenefit = 0
    if (productIds.length > 0) {
      const costs = await db
        .select({
          productId: productProductionCost.productId,
          amount: productProductionCost.amount,
        })
        .from(productProductionCost)
        .where(inArray(productProductionCost.productId, productIds))
      const costByProduct = new Map<string, number>()
      for (const c of costs) {
        const cur = costByProduct.get(c.productId) ?? 0
        costByProduct.set(c.productId, cur + Number(c.amount))
      }
      for (const i of items) {
        if (!i.productId) continue
        const unitCost = costByProduct.get(i.productId) ?? 0
        totalBenefit += Number(i.quantity) * (Number(i.unitPriceTaxIncluded) - unitCost)
      }
    }

    return {
      order: o,
      items,
      totalTaxFree,
      totalTaxIncluded,
      totalBenefit,
    }
  })

const orderCreateSchema = z.object({
  reference: z.string().min(1).max(500).optional(),
  prefixId: z.uuid().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['prepared', 'paid']),
  items: z.array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1) })),
})

export const $createOrder = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(orderCreateSchema))
  .handler(async ({ context: { user }, data }) => {
    if (data.items.length === 0) badRequest('At least one item required', 400)
    if (!data.reference && !data.prefixId)
      badRequest('Either reference or prefixId is required', 400)

    const productIds = [...new Set(data.items.map((i) => i.productId))]
    const products = await db
      .select({
        id: product.id,
        priceTaxFree: product.priceTaxFree,
        vatPercent: product.vatPercent,
        quantity: product.quantity,
      })
      .from(product)
      .where(
        and(
          eq(product.userId, user.id),
          inArray(product.id, productIds),
          isNull(product.archivedAt),
        ),
      )

    const productMap = new Map(products.map((p) => [p.id, p]))
    for (const i of data.items) {
      const p = productMap.get(i.productId)
      if (!p) badRequest(`Product not found, not owned, or archived: ${i.productId}`, 400)
      if (data.status === 'paid' && p.quantity < i.quantity) {
        badRequest(`Insufficient stock for product ${i.productId}`, 400)
      }
    }

    return await db.transaction(async (tx) => {
      let ref: string
      if (data.reference) {
        const existing = await tx
          .select({ id: order.id })
          .from(order)
          .where(and(eq(order.userId, user.id), eq(order.reference, data.reference)))
          .limit(1)
        if (existing.length > 0) badRequest('Reference already exists', 400)
        ref = data.reference
      } else {
        const p = await tx
          .select({ prefix: inventoryOrderReferencePrefix.prefix })
          .from(inventoryOrderReferencePrefix)
          .where(
            and(
              eq(inventoryOrderReferencePrefix.id, data.prefixId!),
              eq(inventoryOrderReferencePrefix.userId, user.id),
            ),
          )
          .then(takeUniqueOrNull)
        if (!p) badRequest('Prefix not found', 400)
        const [last] = await tx
          .select({ reference: order.reference })
          .from(order)
          .where(and(eq(order.userId, user.id), like(order.reference, `${p.prefix}-%`)))
          .orderBy(desc(order.reference))
          .limit(1)
        const n = last
          ? (() => {
              const t = Number(last.reference.split('-').at(-1))
              return (Number.isNaN(t) ? 0 : t) + 1
            })()
          : 1
        ref = `${p.prefix}-${n}`
      }

      const [newOrder] = await tx
        .insert(order)
        .values({
          userId: user.id,
          reference: ref,
          status: data.status,
          description: data.description ?? null,
          ...(data.status === 'paid' && { paidAt: new Date() }),
        })
        .returning(orderListFields)

      if (!newOrder) throw notFound()

      for (const i of data.items) {
        const p = productMap.get(i.productId)!
        const unitPriceTaxFree = String(Number(p.priceTaxFree).toFixed(2))
        const unitPriceTaxIncluded = String(
          priceTaxIncluded(p.priceTaxFree, p.vatPercent).toFixed(2),
        )
        await tx.insert(orderItem).values({
          orderId: newOrder.id,
          productId: i.productId,
          quantity: i.quantity,
          unitPriceTaxFree,
          unitPriceTaxIncluded,
        })
      }

      if (data.status === 'paid') {
        for (const i of data.items) {
          await tx
            .update(product)
            .set({ quantity: sql`${product.quantity} - ${i.quantity}` })
            .where(eq(product.id, i.productId))
        }
      }

      return newOrder
    })
  })

export const $markOrderPaid = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ orderId: z.uuid() })))
  .handler(async ({ context: { user }, data: { orderId } }) => {
    const o = await db
      .select({ id: order.id, status: order.status })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!o) throw notFound()
    if (o.status !== 'prepared') badRequest('Order is not prepared', 400)

    const items = await db
      .select({ productId: orderItem.productId, quantity: orderItem.quantity })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId))

    const productIds = items.map((i) => i.productId)
    const products = await db
      .select({ id: product.id, quantity: product.quantity })
      .from(product)
      .where(inArray(product.id, productIds))
    const productMap = new Map(products.map((p) => [p.id, p]))
    for (const i of items) {
      const p = productMap.get(i.productId)
      if (!p || p.quantity < i.quantity) badRequest('Insufficient stock', 400)
    }

    await db
      .update(order)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))

    for (const i of items) {
      await db
        .update(product)
        .set({ quantity: sql`${product.quantity} - ${i.quantity}` })
        .where(eq(product.id, i.productId))
    }

    const updated = await db
      .select(orderListFields)
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!updated) throw notFound()
    return updated
  })

export const $deleteOrder = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ orderId: z.uuid() })))
  .handler(async ({ context: { user }, data: { orderId } }) => {
    const o = await db
      .select({ id: order.id, status: order.status })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(takeUniqueOrNull)
    if (!o) throw notFound()
    if (o.status !== 'prepared') badRequest('Can only delete prepared orders', 400)

    await db.delete(order).where(and(eq(order.id, orderId), eq(order.userId, user.id)))
    return orderId
  })

export const inventoryStatsQueryKey = ['inventory-stats'] as const

export function getInventoryStatsQueryOptions({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  return queryOptions({
    queryKey: [...inventoryStatsQueryKey, startDate, endDate] as const,
    queryFn: ({ signal }) => $getInventoryStats({ signal, data: { startDate, endDate } }),
    staleTime: 1000 * 60 * 2,
  })
}

export const $getInventoryStats = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(
    validate(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }),
    ),
  )
  .handler(async ({ context: { user }, data: { startDate, endDate } }) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const rows = await db
      .select({
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        unitPriceTaxFree: orderItem.unitPriceTaxFree,
        unitPriceTaxIncluded: orderItem.unitPriceTaxIncluded,
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .where(
        and(
          eq(order.userId, user.id),
          eq(order.status, 'paid'),
          gte(order.paidAt, start),
          lte(order.paidAt, end),
        ),
      )

    let totalSalesTaxFree = 0
    let totalSalesTaxIncluded = 0
    const byProduct: Map<
      string,
      { quantity: number; revenue: number; unitPriceTaxIncluded: number }
    > = new Map()

    for (const r of rows) {
      const q = Number(r.quantity)
      const taxFree = Number(r.unitPriceTaxFree) * q
      const taxIncl = Number(r.unitPriceTaxIncluded) * q
      totalSalesTaxFree += taxFree
      totalSalesTaxIncluded += taxIncl
      const pid = r.productId
      const cur = byProduct.get(pid) ?? {
        quantity: 0,
        revenue: 0,
        unitPriceTaxIncluded: Number(r.unitPriceTaxIncluded),
      }
      cur.quantity += q
      cur.revenue += taxIncl
      byProduct.set(pid, cur)
    }

    const productIds = [...byProduct.keys()]
    let totalBenefit = totalSalesTaxIncluded
    const costByProduct = new Map<string, number>()
    if (productIds.length > 0) {
      const costs = await db
        .select({
          productId: productProductionCost.productId,
          amount: productProductionCost.amount,
        })
        .from(productProductionCost)
        .where(inArray(productProductionCost.productId, productIds))
      for (const c of costs) {
        const cur = costByProduct.get(c.productId) ?? 0
        costByProduct.set(c.productId, cur + Number(c.amount))
      }
      for (const r of rows) {
        const unitCost = costByProduct.get(r.productId) ?? 0
        totalBenefit -= Number(r.quantity) * unitCost
      }
    }

    const productNames =
      productIds.length > 0
        ? await db
            .select({ id: product.id, name: product.name })
            .from(product)
            .where(inArray(product.id, productIds))
        : []
    const nameMap = new Map(productNames.map((p) => [p.id, p.name]))

    const topByRevenue = [...byProduct.entries()]
      .toSorted((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([productId, v]) => ({
        productId,
        productName: nameMap.get(productId) ?? null,
        quantity: v.quantity,
        revenue: v.revenue,
      }))

    const benefitByProduct = new Map<string, number>()
    for (const [pid, v] of byProduct.entries()) {
      const unitCost = costByProduct.get(pid) ?? 0
      benefitByProduct.set(pid, v.revenue - v.quantity * unitCost)
    }
    const topByBenefit = [...benefitByProduct.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([productId, benefit]) => ({
        productId,
        productName: nameMap.get(productId) ?? null,
        quantity: byProduct.get(productId)!.quantity,
        benefit,
      }))

    return {
      totalSalesTaxFree,
      totalSalesTaxIncluded,
      totalBenefit,
      topByRevenue,
      topByBenefit,
    }
  })

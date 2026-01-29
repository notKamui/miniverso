import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, inArray, ilike, isNull, lte, sql } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { type DbOrTransaction, type Transaction, db, takeUniqueOr } from '@/server/db'
import {
  inventoryOrderReferencePrefix,
  order,
  orderItem,
  product,
  productBundleItem,
  productProductionCost,
} from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'
import { getNextOrderReferenceForPrefix } from './order-reference-prefixes'
import { priceTaxIncluded } from './utils'

/** Product kind for expansion. */
export type ProductKind = 'simple' | 'bundle'

/**
 * Pure helper: compute required quantities of simple products from order items.
 * For simple products, adds quantity directly; for bundles, expands into components.
 * Used by expandBundleItems and by tests.
 */
export function computeRequiredQuantities(
  items: { productId: string; quantity: number }[],
  productMap: Map<string, { kind: ProductKind }>,
  bundleItemsMap: Map<string, Array<{ productId: string; quantity: number }>>,
): Map<string, number> {
  const requiredQuantities = new Map<string, number>()
  for (const item of items) {
    const p = productMap.get(item.productId)
    if (!p) continue
    if (p.kind === 'simple') {
      const current = requiredQuantities.get(item.productId) ?? 0
      requiredQuantities.set(item.productId, current + item.quantity)
    } else if (p.kind === 'bundle') {
      const components = bundleItemsMap.get(item.productId) ?? []
      for (const component of components) {
        const requiredQty = item.quantity * component.quantity
        const current = requiredQuantities.get(component.productId) ?? 0
        requiredQuantities.set(component.productId, current + requiredQty)
      }
    }
  }
  return requiredQuantities
}

/**
 * Expands order items into simple product requirements (async, loads from db).
 * For simple products, returns the quantity directly.
 * For bundle products, expands into component products.
 * Returns a Map of simple product ID -> required quantity.
 */
async function expandBundleItems(
  items: { productId: string; quantity: number }[],
  userId: string,
  tx?: Transaction,
): Promise<Map<string, number>> {
  const dbInstance: DbOrTransaction = tx ?? db
  const productIds = [...new Set(items.map((i) => i.productId))]

  const products = await dbInstance
    .select({
      id: product.id,
      kind: product.kind,
    })
    .from(product)
    .where(
      and(eq(product.userId, userId), inArray(product.id, productIds), isNull(product.archivedAt)),
    )

  const productMap = new Map(products.map((p) => [p.id, p]))
  const bundleIds = products.filter((p) => p.kind === 'bundle').map((p) => p.id)

  const bundleItemsMap = new Map<string, Array<{ productId: string; quantity: number }>>()
  if (bundleIds.length > 0) {
    const bundleItems = await dbInstance
      .select({
        bundleId: productBundleItem.bundleId,
        productId: productBundleItem.productId,
        quantity: productBundleItem.quantity,
      })
      .from(productBundleItem)
      .where(inArray(productBundleItem.bundleId, bundleIds))
    for (const bi of bundleItems) {
      const existing = bundleItemsMap.get(bi.bundleId) ?? []
      existing.push({ productId: bi.productId, quantity: Number(bi.quantity) })
      bundleItemsMap.set(bi.bundleId, existing)
    }
  }

  return computeRequiredQuantities(items, productMap, bundleItemsMap)
}

export const ordersQueryKey = ['orders'] as const

export const orderListFields = {
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
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    const items = await db
      .select({
        id: orderItem.id,
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        unitPriceTaxFree: orderItem.unitPriceTaxFree,
        unitPriceTaxIncluded: orderItem.unitPriceTaxIncluded,
        priceModifications: orderItem.priceModifications,
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

const orderItemModificationSchema = z.object({
  type: z.enum(['increase', 'decrease']),
  kind: z.enum(['flat', 'relative']),
  value: z.number(),
})

const orderCreateSchema = z.object({
  reference: z.string().min(1).max(500).optional(),
  prefixId: z.uuid().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['prepared', 'sent', 'paid']),
  items: z.array(
    z.object({
      productId: z.uuid(),
      quantity: z.number().int().min(1),
      unitPriceTaxFree: z.number().min(0).optional(),
      modifications: z.array(orderItemModificationSchema).optional(),
    }),
  ),
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
        kind: product.kind,
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
    }

    // Stock validation: expand bundles and check simple product stock
    if (data.status === 'paid') {
      const requiredQuantities = await expandBundleItems(data.items, user.id)
      const simpleProductIds = [...requiredQuantities.keys()]

      if (simpleProductIds.length > 0) {
        const simpleProducts = await db
          .select({
            id: product.id,
            quantity: product.quantity,
          })
          .from(product)
          .where(and(eq(product.userId, user.id), inArray(product.id, simpleProductIds)))

        const simpleProductMap = new Map(simpleProducts.map((p) => [p.id, p]))
        for (const [productId, requiredQty] of requiredQuantities.entries()) {
          const p = simpleProductMap.get(productId)
          if (!p || p.quantity < requiredQty) {
            badRequest(`Insufficient stock for product ${productId}`, 400)
          }
        }
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
          .then(
            takeUniqueOr(() => {
              badRequest('Prefix not found', 400)
            }),
          )

        ref = await getNextOrderReferenceForPrefix(tx, user.id, p.prefix)
      }

      const newOrder = await tx
        .insert(order)
        .values({
          userId: user.id,
          reference: ref,
          status: data.status,
          description: data.description ?? null,
          ...(data.status === 'paid' && { paidAt: new Date() }),
        })
        .returning(orderListFields)
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )

      for (const i of data.items) {
        const p = productMap.get(i.productId)!
        const basePrice = Number(p.priceTaxFree)
        const overridePrice = i.unitPriceTaxFree
        const priceTaxFree =
          overridePrice !== undefined && overridePrice >= 0 ? overridePrice : basePrice
        // Sanity check: avoid typos (e.g. max 100× product price)
        const maxPrice = basePrice * 100
        if (priceTaxFree > maxPrice)
          badRequest(
            `Unit price for product ${i.productId} exceeds maximum (${maxPrice.toFixed(2)})`,
            400,
          )
        const unitPriceTaxFree = String(Number(priceTaxFree).toFixed(2))
        const unitPriceTaxIncluded = String(priceTaxIncluded(priceTaxFree, p.vatPercent).toFixed(2))
        const priceModifications =
          i.modifications && i.modifications.length > 0 ? i.modifications : null
        await tx.insert(orderItem).values({
          orderId: newOrder.id,
          productId: i.productId,
          quantity: i.quantity,
          unitPriceTaxFree,
          unitPriceTaxIncluded,
          priceModifications,
        })
      }

      if (data.status === 'paid') {
        // Expand bundles and deduct stock from simple products only
        const requiredQuantities = await expandBundleItems(data.items, user.id, tx)
        for (const [productId, quantity] of requiredQuantities.entries()) {
          await tx
            .update(product)
            .set({ quantity: sql`${product.quantity} - ${quantity}` })
            .where(eq(product.id, productId))
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
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )
    if (o.status !== 'prepared') badRequest('Order is not prepared', 400)

    const items = await db
      .select({ productId: orderItem.productId, quantity: orderItem.quantity })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId))

    // Expand bundles and validate stock for simple products
    const requiredQuantities = await expandBundleItems(
      items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      user.id,
    )

    const simpleProductIds = [...requiredQuantities.keys()]
    if (simpleProductIds.length > 0) {
      const simpleProducts = await db
        .select({
          id: product.id,
          quantity: product.quantity,
        })
        .from(product)
        .where(and(eq(product.userId, user.id), inArray(product.id, simpleProductIds)))

      const simpleProductMap = new Map(simpleProducts.map((p) => [p.id, p]))
      for (const [productId, requiredQty] of requiredQuantities.entries()) {
        const p = simpleProductMap.get(productId)
        if (!p || p.quantity < requiredQty) {
          badRequest(`Insufficient stock for product ${productId}`, 400)
        }
      }
    }

    await db
      .update(order)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))

    // Deduct stock from simple products only (bundles are expanded)
    for (const [productId, quantity] of requiredQuantities.entries()) {
      await db
        .update(product)
        .set({ quantity: sql`${product.quantity} - ${quantity}` })
        .where(eq(product.id, productId))
    }

    const updated = await db
      .select(orderListFields)
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    return updated
  })

export const $markOrderSent = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(z.object({ orderId: z.uuid() })))
  .handler(async ({ context: { user }, data: { orderId } }) => {
    const o = await db
      .select({ id: order.id, status: order.status })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    if (o.status !== 'paid') badRequest('Order is not paid', 400)

    const updated = await db
      .update(order)
      .set({ status: 'sent' })
      .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
      .returning(orderListFields)
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

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
      .then(
        takeUniqueOr(() => {
          throw notFound()
        }),
      )

    if (o.status !== 'prepared') badRequest('Can only delete prepared orders', 400)

    await db.delete(order).where(and(eq(order.id, orderId), eq(order.userId, user.id)))
    return orderId
  })

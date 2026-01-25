import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, inArray, ilike, isNull, like, lte, sql } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOrNull } from '@/server/db'
import {
  inventoryOrderReferencePrefix,
  order,
  orderItem,
  product,
  productProductionCost,
} from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'
import { priceTaxIncluded } from './utils'

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

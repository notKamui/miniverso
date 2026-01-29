import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, inArray, ilike, lte, sql } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr } from '@/server/db'
import { order, orderItem, product, productProductionCost } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'

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

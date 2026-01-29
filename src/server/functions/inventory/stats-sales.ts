import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db } from '@/server/db'
import { order, orderItem, product, productProductionCost } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'

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
        startDate: z.iso.datetime(),
        endDate: z.iso.datetime(),
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

    const topByQuantitySold = [...byProduct.entries()]
      .toSorted((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10)
      .map(([productId, v]) => ({
        productId,
        productName: nameMap.get(productId) ?? null,
        quantity: v.quantity,
      }))

    return {
      totalSalesTaxFree,
      totalSalesTaxIncluded,
      totalBenefit,
      topByRevenue,
      topByBenefit,
      topByQuantitySold,
    }
  })

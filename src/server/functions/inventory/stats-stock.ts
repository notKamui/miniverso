import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { validate } from '@/lib/utils/validate'
import { db } from '@/server/db'
import { product, productProductionCost } from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { priceTaxIncluded } from './utils'

export const inventoryStockStatsQueryKey = ['inventory-stock-stats'] as const

export function getInventoryStockStatsQueryOptions({ labelIds = [] }: { labelIds?: string[] }) {
  const cacheKey = labelIds.length === 0 ? 'all' : [...labelIds].toSorted().join(',')
  return queryOptions({
    queryKey: [...inventoryStockStatsQueryKey, cacheKey] as const,
    queryFn: ({ signal }) => $getInventoryStockStats({ signal, data: { labelIds } }),
    staleTime: 1000 * 60 * 2,
  })
}

export const $getInventoryStockStats = createServerFn({ method: 'GET' })
  .middleware([$$auth])
  .inputValidator(validate(z.object({ labelIds: z.array(z.uuid()).optional() })))
  .handler(async ({ context: { user }, data: { labelIds } }) => {
    const products = await db
      .select({
        id: product.id,
        quantity: product.quantity,
        priceTaxFree: product.priceTaxFree,
        vatPercent: product.vatPercent,
        kind: product.kind,
      })
      .from(product)
      .where(
        and(eq(product.userId, user.id), isNull(product.archivedAt), eq(product.kind, 'simple')),
      )

    if (products.length === 0) {
      return {
        totalWorthExTax: 0,
        totalWorthIncTax: 0,
        totalProdCost: 0,
        potentialBenefit: 0,
      }
    }

    const productIds = products.map((p) => p.id)
    const costConditions = [inArray(productProductionCost.productId, productIds)]
    if (labelIds != null && labelIds.length > 0) {
      costConditions.push(inArray(productProductionCost.productionCostLabelId, labelIds))
    }
    const costs = await db
      .select({
        productId: productProductionCost.productId,
        amount: productProductionCost.amount,
      })
      .from(productProductionCost)
      .where(and(...costConditions))

    const costByProduct = new Map<string, number>()
    for (const c of costs) {
      const cur = costByProduct.get(c.productId) ?? 0
      costByProduct.set(c.productId, cur + Number(c.amount))
    }

    let totalWorthExTax = 0
    let totalWorthIncTax = 0
    let totalProdCost = 0
    for (const p of products) {
      const q = p.quantity
      const ex = q * Number(p.priceTaxFree)
      const inc = q * priceTaxIncluded(p.priceTaxFree, p.vatPercent)
      totalWorthExTax += ex
      totalWorthIncTax += inc
      totalProdCost += q * (costByProduct.get(p.id) ?? 0)
    }
    const potentialBenefit = totalWorthIncTax - totalProdCost

    return {
      totalWorthExTax,
      totalWorthIncTax,
      totalProdCost,
      potentialBenefit,
    }
  })

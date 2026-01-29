import { and, eq, inArray, isNull } from 'drizzle-orm'
import { type DbOrTransaction, type Transaction, db } from '@/server/db'
import { product, productBundleItem } from '@/server/db/schema/inventory'

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
export async function expandBundleItems(
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

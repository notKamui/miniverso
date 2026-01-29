import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { DbOrTransaction } from '@/server/db'
import { badRequest } from '@/lib/utils/response'
import { inventoryProductionCostLabel, inventoryTag, product } from '@/server/db/schema/inventory'

export async function validateProductTagIds(
  dbOrTx: DbOrTransaction,
  userId: string,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) return
  const tags = await dbOrTx
    .select({ id: inventoryTag.id })
    .from(inventoryTag)
    .where(and(eq(inventoryTag.userId, userId), inArray(inventoryTag.id, tagIds)))
  if (tags.length !== tagIds.length) badRequest('Invalid tagIds', 400)
}

export async function validateProductionCostLabelIds(
  dbOrTx: DbOrTransaction,
  userId: string,
  labelIds: string[],
): Promise<void> {
  if (labelIds.length === 0) return
  const labels = await dbOrTx
    .select({ id: inventoryProductionCostLabel.id })
    .from(inventoryProductionCostLabel)
    .where(
      and(
        eq(inventoryProductionCostLabel.userId, userId),
        inArray(inventoryProductionCostLabel.id, labelIds),
      ),
    )
  if (labels.length !== labelIds.length) badRequest('Invalid production cost labelIds', 400)
}

export async function validateBundleComponents(
  dbOrTx: DbOrTransaction,
  userId: string,
  componentIds: string[],
): Promise<void> {
  if (componentIds.length === 0) return
  const components = await dbOrTx
    .select({ id: product.id, kind: product.kind })
    .from(product)
    .where(
      and(
        eq(product.userId, userId),
        inArray(product.id, componentIds),
        isNull(product.archivedAt),
      ),
    )
  if (components.length !== componentIds.length)
    badRequest('Invalid bundle component productIds', 400)
  const nonSimple = components.filter((c) => c.kind !== 'simple')
  if (nonSimple.length > 0) badRequest('Bundle components must be simple products', 400)
}

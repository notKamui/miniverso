import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, exists, inArray, ilike, isNotNull, isNull, or } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { db, paginated, takeUniqueOr, takeUniqueOrNull } from '@/server/db'
import {
  inventoryProductionCostLabel,
  inventoryTag,
  product,
  productBundleItem,
  productProductionCost,
  productTag,
} from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'
import { productCreateSchema, productUpdateSchema } from './products-schemas'
import {
  validateBundleComponents,
  validateProductionCostLabelIds,
  validateProductTagIds,
} from './products-validation'

export const productsQueryKey = ['products'] as const

export const productListFields = {
  id: product.id,
  userId: product.userId,
  name: product.name,
  description: product.description,
  sku: product.sku,
  priceTaxFree: product.priceTaxFree,
  vatPercent: product.vatPercent,
  quantity: product.quantity,
  kind: product.kind,
  archivedAt: product.archivedAt,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
} as const

const getProductsSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(500).optional(),
  archived: z.enum(['all', 'active', 'archived']).default('all'),
  tagIds: z.array(z.uuid()).optional(),
  orderBy: z.enum(['name', 'price', 'updatedAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
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
  .handler(
    async ({
      context: { user },
      data: { page, size, search, archived, tagIds, orderBy, order },
    }) => {
      const conditions: Parameters<typeof and>[0][] = [eq(product.userId, user.id)]
      if (search) {
        const pattern = search.replaceAll(/[%_]/g, String.raw`\$&`)
        conditions.push(or(ilike(product.name, `%${pattern}%`), ilike(product.sku, `%${pattern}%`)))
      }
      if (archived === 'active') conditions.push(isNull(product.archivedAt))
      else if (archived === 'archived') conditions.push(isNotNull(product.archivedAt))
      if (tagIds?.length) {
        conditions.push(
          exists(
            db
              .select()
              .from(productTag)
              .where(and(eq(productTag.productId, product.id), inArray(productTag.tagId, tagIds))),
          ),
        )
      }

      const orderColumn =
        orderBy === 'price'
          ? product.priceTaxFree
          : orderBy === 'updatedAt'
            ? product.updatedAt
            : product.name

      const direction = order === 'desc' ? desc(orderColumn) : asc(orderColumn)

      const pageResult = await paginated({
        table: product,
        where: and(...conditions),
        orderBy: direction,
        page,
        size,
      })

      const productIds = pageResult.items.map((p) => p.id)
      if (productIds.length === 0) {
        return {
          ...pageResult,
          items: pageResult.items.map((p) => ({ ...p, tags: [], totalProductionCost: 0 })),
        }
      }

      const [tagsRows, costsRows] = await Promise.all([
        db
          .select({
            productId: productTag.productId,
            id: inventoryTag.id,
            name: inventoryTag.name,
            color: inventoryTag.color,
          })
          .from(productTag)
          .innerJoin(inventoryTag, eq(productTag.tagId, inventoryTag.id))
          .where(inArray(productTag.productId, productIds)),
        db
          .select({
            productId: productProductionCost.productId,
            amount: productProductionCost.amount,
          })
          .from(productProductionCost)
          .where(inArray(productProductionCost.productId, productIds)),
      ])

      const tagsByProduct: Record<string, { id: string; name: string; color: string }[]> = {}
      for (const r of tagsRows) {
        if (!tagsByProduct[r.productId]) tagsByProduct[r.productId] = []
        tagsByProduct[r.productId].push({ id: r.id, name: r.name, color: r.color })
      }

      const costByProduct: Record<string, number> = {}
      for (const r of costsRows) {
        costByProduct[r.productId] = (costByProduct[r.productId] ?? 0) + Number(r.amount)
      }

      const items = pageResult.items.map((p) => ({
        ...p,
        tags: tagsByProduct[p.id] ?? [],
        totalProductionCost: costByProduct[p.id] ?? 0,
      }))

      return { ...pageResult, items }
    },
  )

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

    const bundleItems = await db
      .select({
        productId: productBundleItem.productId,
        quantity: productBundleItem.quantity,
      })
      .from(productBundleItem)
      .where(eq(productBundleItem.bundleId, productId))

    return {
      product: p,
      tags,
      productionCosts: costs,
      bundleItems: bundleItems.map((b) => ({
        productId: b.productId,
        quantity: Number(b.quantity),
      })),
    }
  })

export const $createProduct = createServerFn({ method: 'POST' })
  .middleware([$$auth, $$rateLimit])
  .inputValidator(validate(productCreateSchema))
  .handler(async ({ context: { user }, data }) => {
    await validateProductTagIds(db, user.id, data.tagIds)
    await validateProductionCostLabelIds(db, user.id, [
      ...new Set(data.productionCosts.map((c) => c.labelId)),
    ])
    if (data.kind === 'bundle') {
      await validateBundleComponents(db, user.id, [
        ...new Set(data.bundleItems.map((b) => b.productId)),
      ])
    }

    const quantity = data.kind === 'bundle' ? 0 : data.quantity
    return await db.transaction(async (tx) => {
      const p = await tx
        .insert(product)
        .values({
          userId: user.id,
          name: data.name,
          description: data.description ?? null,
          sku: data.sku,
          priceTaxFree: String(data.priceTaxFree.toFixed(2)),
          vatPercent: String(data.vatPercent.toFixed(2)),
          quantity,
          kind: data.kind,
        })
        .returning(productListFields)
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )

      if (data.tagIds.length > 0) {
        await tx.insert(productTag).values(data.tagIds.map((tagId) => ({ productId: p.id, tagId })))
      }
      if (data.productionCosts.length > 0) {
        await tx.insert(productProductionCost).values(
          data.productionCosts.map((c) => ({
            productId: p.id,
            productionCostLabelId: c.labelId,
            amount: String(c.amount.toFixed(2)),
          })),
        )
      }
      if (data.kind === 'bundle' && data.bundleItems.length > 0) {
        await tx.insert(productBundleItem).values(
          data.bundleItems.map((b) => ({
            bundleId: p.id,
            productId: b.productId,
            quantity: b.quantity,
          })),
        )
      }

      return p
    })
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

    const kind = rest.kind
    const bundleItems = rest.bundleItems
    delete (rest as Record<string, unknown>).kind
    delete (rest as Record<string, unknown>).bundleItems

    const set: Record<string, unknown> = {}
    if (rest.name !== undefined) set.name = rest.name
    if (rest.description !== undefined) set.description = rest.description
    if (rest.sku !== undefined) set.sku = rest.sku
    if (rest.priceTaxFree !== undefined) set.priceTaxFree = String(rest.priceTaxFree.toFixed(2))
    if (rest.vatPercent !== undefined) set.vatPercent = String(rest.vatPercent.toFixed(2))
    if (kind !== undefined) set.kind = kind
    if (rest.quantity !== undefined) {
      if (rest.quantity < 0) badRequest('quantity must be >= 0', 400)
      set.quantity = rest.quantity
    } else if (kind === 'bundle') {
      set.quantity = 0
    }
    if (archivedAt !== undefined) {
      set.archivedAt = archivedAt ? new Date() : null
    }

    if (kind === 'bundle' && bundleItems !== undefined) {
      if (bundleItems.length === 0) badRequest('Bundle must have at least one component', 400)
      if (bundleItems.some((b) => b.productId === id))
        badRequest('Bundle cannot contain itself', 400)
      await validateBundleComponents(db, user.id, [...new Set(bundleItems.map((b) => b.productId))])
    }

    return await db.transaction(async (tx) => {
      if (Object.keys(set).length > 0) {
        await tx
          .update(product)
          .set(set)
          .where(and(eq(product.id, id), eq(product.userId, user.id)))
      }

      if (kind !== undefined || bundleItems !== undefined) {
        await tx.delete(productBundleItem).where(eq(productBundleItem.bundleId, id))
        if (kind === 'bundle' && bundleItems && bundleItems.length > 0) {
          await tx.insert(productBundleItem).values(
            bundleItems.map((b) => ({
              bundleId: id,
              productId: b.productId,
              quantity: b.quantity,
            })),
          )
        }
      }

      if (tagIds !== undefined) {
        await tx.delete(productTag).where(eq(productTag.productId, id))
        if (tagIds.length > 0) {
          await validateProductTagIds(tx, user.id, tagIds)
          await tx.insert(productTag).values(tagIds.map((tagId) => ({ productId: id, tagId })))
        }
      }
      if (productionCosts !== undefined) {
        await tx.delete(productProductionCost).where(eq(productProductionCost.productId, id))
        if (productionCosts.length > 0) {
          const labelIds = [...new Set(productionCosts.map((c) => c.labelId))]
          await validateProductionCostLabelIds(tx, user.id, labelIds)
          await tx.insert(productProductionCost).values(
            productionCosts.map((c) => ({
              productId: id,
              productionCostLabelId: c.labelId,
              amount: String(c.amount.toFixed(2)),
            })),
          )
        }
      }

      const out = await tx
        .select(productListFields)
        .from(product)
        .where(and(eq(product.id, id), eq(product.userId, user.id)))
        .then(takeUniqueOrNull)
      if (!out) throw notFound()
      return out
    })
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

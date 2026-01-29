import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import * as z from 'zod'
import { badRequest } from '@/lib/utils/response'
import { validate } from '@/lib/utils/validate'
import { db, takeUniqueOr } from '@/server/db'
import {
  inventoryOrderReferencePrefix,
  order,
  orderItem,
  product,
} from '@/server/db/schema/inventory'
import { $$auth } from '@/server/middlewares/auth'
import { $$rateLimit } from '@/server/middlewares/rate-limit'
import { getNextOrderReferenceForPrefix } from './order-reference-prefixes'
import { expandBundleItems } from './orders-bundles'
import { orderListFields } from './orders-queries'
import { priceTaxIncluded } from './utils'

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

    return await db.transaction(async (tx) => {
      await tx
        .update(order)
        .set({ status: 'paid', paidAt: new Date() })
        .where(and(eq(order.id, orderId), eq(order.userId, user.id)))

      for (const [productId, quantity] of requiredQuantities.entries()) {
        await tx
          .update(product)
          .set({ quantity: sql`${product.quantity} - ${quantity}` })
          .where(eq(product.id, productId))
      }

      return await tx
        .select(orderListFields)
        .from(order)
        .where(and(eq(order.id, orderId), eq(order.userId, user.id)))
        .then(
          takeUniqueOr(() => {
            throw notFound()
          }),
        )
    })
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

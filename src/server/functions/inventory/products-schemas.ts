import * as z from 'zod'

export const bundleItemPayloadSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
})

export const productUpsertBaseSchema = z.object({
  name: z.string().min(1).max(2000),
  description: z.string().max(10_000).optional(),
  sku: z.string().min(1).max(200),
  priceTaxFree: z.number().min(0),
  vatPercent: z.number().min(0).max(100),
  kind: z.enum(['simple', 'bundle']).default('simple'),
  quantity: z.number().int().min(0),
  tagIds: z.array(z.uuid()).default([]),
  productionCosts: z.array(z.object({ labelId: z.uuid(), amount: z.number().min(0) })).default([]),
  bundleItems: z.array(bundleItemPayloadSchema).default([]),
})

export const productCreateSchema = productUpsertBaseSchema.refine(
  (data) => data.kind !== 'bundle' || data.bundleItems.length > 0,
  { message: 'Bundle must have at least one component', path: ['bundleItems'] },
)

export const productUpdateSchema = productUpsertBaseSchema
  .partial()
  .extend({
    id: z.uuid(),
    archivedAt: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'bundle') {
      if (!data.bundleItems || data.bundleItems.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Bundle must have at least one component',
          path: ['bundleItems'],
        })
      }
      if (data.bundleItems?.some((b) => b.productId === data.id)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Bundle cannot contain itself',
          path: ['bundleItems'],
        })
      }
    } else if (data.bundleItems?.some((b) => b.productId === data.id)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Bundle cannot contain itself',
        path: ['bundleItems'],
      })
    }
  })

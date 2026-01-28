import * as z from 'zod'

const bundleItemSchema = z.object({
  productId: z.uuid(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Math.floor(Number.parseFloat(v) || 0) : v))
    .pipe(z.number().int().min(1, 'Quantity must be ≥ 1')),
})

export const productFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(2000),
    description: z.string().max(10_000).optional(),
    sku: z.string().min(1, 'SKU is required').max(200),
    priceTaxFree: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number.parseFloat(v) || 0 : v))
      .pipe(z.number().min(0, 'Price must be ≥ 0')),
    vatPercent: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number.parseFloat(v) || 0 : v))
      .pipe(z.number().min(0).max(100, 'VAT must be 0-100')),
    kind: z.enum(['simple', 'bundle']).default('simple'),
    quantity: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Math.floor(Number.parseFloat(v) || 0) : v))
      .pipe(z.number().int().min(0, 'Quantity must be ≥ 0')),
    tagIds: z.array(z.uuid()).default([]),
    productionCosts: z
      .array(
        z.object({
          labelId: z.string(),
          amount: z
            .string()
            .transform((v) => Number.parseFloat(v) || 0)
            .pipe(z.number().min(0)),
        }),
      )
      .default([]),
    bundleItems: z.array(bundleItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'bundle' && (!data.bundleItems || data.bundleItems.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Bundle must have at least one component',
        path: ['bundleItems'],
      })
    }
  })

export type ProductFormValues = z.input<typeof productFormSchema>
export type ProductFormPayload = z.output<typeof productFormSchema>

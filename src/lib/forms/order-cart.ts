import * as z from 'zod'

const orderItemModificationSchema = z.object({
  type: z.enum(['increase', 'decrease']),
  kind: z.enum(['flat', 'relative']),
  value: z.number(),
})

export const orderCartSubmitSchema = z.object({
  prefixId: z.uuid('Select a reference prefix'),
  description: z.string().max(10_000).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1),
        unitPriceTaxFree: z.number().min(0).optional(),
        modifications: z.array(orderItemModificationSchema).optional(),
      }),
    )
    .min(1, 'Add at least one product'),
})

export type OrderCartSubmitPayload = z.output<typeof orderCartSubmitSchema>

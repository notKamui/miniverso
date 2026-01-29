import * as z from 'zod'

export const orderCartSubmitSchema = z.object({
  prefixId: z.uuid('Select a reference prefix'),
  description: z.string().max(10_000).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1),
        unitPriceTaxFree: z.number().min(0).optional(),
      }),
    )
    .min(1, 'Add at least one product'),
})

export type OrderCartSubmitPayload = z.output<typeof orderCartSubmitSchema>

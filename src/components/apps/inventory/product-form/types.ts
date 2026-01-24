import type { ProductFormValues } from '@/lib/forms/product'
import type { $getProduct } from '@/server/functions/inventory'

export type ProductFormExisting = Awaited<ReturnType<typeof $getProduct>>

export type ProductFormProps = {
  productId?: string
  existing?: ProductFormExisting
  onSuccess?: () => void
}

export function getProductFormDefaultValues(existing?: ProductFormExisting): ProductFormValues {
  if (existing == null) {
    return {
      name: '',
      description: '',
      sku: '',
      priceTaxFree: '',
      vatPercent: '20',
      quantity: '0',
      tagIds: [],
      productionCosts: [],
    }
  }
  return {
    name: existing.product.name,
    description: existing.product.description != null ? existing.product.description : '',
    sku: existing.product.sku ?? '',
    priceTaxFree: String(existing.product.priceTaxFree),
    vatPercent: String(existing.product.vatPercent),
    quantity: String(existing.product.quantity),
    tagIds: existing.tags.map((t) => t.id),
    productionCosts: existing.productionCosts.map((c) => ({
      labelId: c.labelId,
      amount: String(c.amount),
    })),
  }
}

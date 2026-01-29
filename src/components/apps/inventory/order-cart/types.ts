import type { DataFromQueryOptions } from '@/lib/utils/types'
import { getOrderPriceModificationPresetsQueryOptions } from '@/server/functions/inventory/order-price-modification-presets'
import { getOrderReferencePrefixesQueryOptions } from '@/server/functions/inventory/order-reference-prefixes'
import { getProductsQueryOptions } from '@/server/functions/inventory/products'

export type CartItem = {
  productId: string
  quantity: number
  name: string
  priceTaxFree: number
  vatPercent: number
  unitPriceTaxFree?: number
}

export type PriceModification = {
  type: 'increase' | 'decrease'
  kind: 'flat' | 'relative'
  value: number
}

export type Prefix = DataFromQueryOptions<
  ReturnType<typeof getOrderReferencePrefixesQueryOptions>
>[number]

export type Product = DataFromQueryOptions<
  ReturnType<typeof getProductsQueryOptions>
>['items'][number]

export type Preset = DataFromQueryOptions<
  ReturnType<typeof getOrderPriceModificationPresetsQueryOptions>
>[number]

export type OrderCartFormValues = {
  prefix: Prefix | null
  description: string
  items: CartItem[]
  addProduct: Product | null
  addQty: string
  productSearch: string
}

export const defaultValues: OrderCartFormValues = {
  prefix: null,
  description: '',
  items: [],
  addProduct: null,
  addQty: '1',
  productSearch: '',
}

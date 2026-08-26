import { createFileRoute } from '@tanstack/react-router'
import { CurrencySection } from '@/components/apps/inventory/settings/currency-section'
import { OrderPriceModificationPresetsSection } from '@/components/apps/inventory/settings/order-price-modification-presets-section'
import { OrderReferencePrefixesSection } from '@/components/apps/inventory/settings/order-reference-prefixes-section'
import { ProductTagsSection } from '@/components/apps/inventory/settings/product-tags-section'
import { ProductionCostLabelsSection } from '@/components/apps/inventory/settings/production-cost-labels-section'
import { title } from '@/components/ui/typography'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getOrderPriceModificationPresetsQueryOptions } from '@/server/functions/inventory/order-price-modification-presets'
import { getOrderReferencePrefixesQueryOptions } from '@/server/functions/inventory/order-reference-prefixes'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'

export const Route = createFileRoute('/_authed/inventory/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...getInventoryCurrencyQueryOptions(), staleTime: 'static' }),
      queryClient.query({ ...getOrderReferencePrefixesQueryOptions(), staleTime: 'static' }),
      queryClient.query({
        ...getOrderPriceModificationPresetsQueryOptions(),
        staleTime: 'static',
      }),
      queryClient.query({ ...getInventoryTagsQueryOptions(), staleTime: 'static' }),
      queryClient.query({ ...getProductionCostLabelsQueryOptions(), staleTime: 'static' }),
    ])
    return { crumb: 'Settings' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>Inventory Settings</h2>
      <OrderReferencePrefixesSection />
      <OrderPriceModificationPresetsSection />
      <ProductTagsSection />
      <ProductionCostLabelsSection />
      <CurrencySection />
    </div>
  )
}

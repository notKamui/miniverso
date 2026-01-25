import { createFileRoute } from '@tanstack/react-router'
import { OrderReferencePrefixesSection } from '@/components/apps/inventory/settings/order-reference-prefixes-section'
import { ProductTagsSection } from '@/components/apps/inventory/settings/product-tags-section'
import { ProductionCostLabelsSection } from '@/components/apps/inventory/settings/production-cost-labels-section'
import { title } from '@/components/ui/typography'
import {
  getInventoryTagsQueryOptions,
  getOrderReferencePrefixesQueryOptions,
  getProductionCostLabelsQueryOptions,
} from '@/server/functions/inventory'

export const Route = createFileRoute('/_authed/inventory/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getOrderReferencePrefixesQueryOptions()),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
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
      <ProductTagsSection />
      <ProductionCostLabelsSection />
    </div>
  )
}

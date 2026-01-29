import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ProductForm } from '@/components/apps/inventory/product-form'
import { title } from '@/components/ui/typography'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'

export const Route = createFileRoute('/_authed/inventory/products/new')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
    ])
    return { crumb: 'New product' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>New product</h2>
      <ProductForm onSuccess={() => navigate({ to: '/inventory' })} />
    </div>
  )
}

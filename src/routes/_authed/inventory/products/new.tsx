import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { ProductForm } from '@/components/apps/inventory/product-form'
import { title } from '@/components/ui/typography'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'
import { getProductQueryOptions } from '@/server/functions/inventory/products'

const searchSchema = z.object({
  duplicateFrom: z.uuid().optional(),
})

export const Route = createFileRoute('/_authed/inventory/products/new')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ duplicateFrom: search.duplicateFrom }),
  loader: async ({ context: { queryClient }, deps: { duplicateFrom } }) => {
    const [duplicateFromData] = await Promise.all([
      duplicateFrom
        ? queryClient.ensureQueryData(getProductQueryOptions(duplicateFrom))
        : Promise.resolve(undefined),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
    ])
    return { crumb: 'New product', duplicateFromData }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { duplicateFromData } = Route.useLoaderData()
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>New product</h2>
      <ProductForm
        duplicateFrom={duplicateFromData}
        onSuccess={() => navigate({ to: '/inventory' })}
      />
    </div>
  )
}

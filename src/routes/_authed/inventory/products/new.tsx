import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { ProductForm } from '@/components/apps/inventory/product-form'
import { title } from '@/components/ui/typography'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'
import { getProductQueryOptions } from '@/server/functions/inventory/products'

const searchSchema = z.object({
  duplicateFrom: z.uuid().optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
  q: z.string().optional(),
  archived: z.enum(['all', 'active', 'archived']).optional(),
  tagIds: z.array(z.uuid()).optional(),
  orderBy: z.enum(['name', 'price', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
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
  const listSearch = Route.useSearch({
    select: ({ duplicateFrom: _duplicateFrom, ...search }) => ({ ...search }),
  })
  const { duplicateFromData } = Route.useLoaderData()
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>New product</h2>
      <ProductForm
        duplicateFrom={duplicateFromData}
        onSuccess={() => navigate({ to: '/inventory', search: listSearch, replace: true })}
      />
    </div>
  )
}

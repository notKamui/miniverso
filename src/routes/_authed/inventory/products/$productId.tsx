import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { ProductForm } from '@/components/apps/inventory/product-form'
import { title } from '@/components/ui/typography'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'
import { getProductQueryOptions } from '@/server/functions/inventory/products'

const searchSchema = z.object({
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(100).optional(),
  q: z.string().optional(),
  archived: z.enum(['all', 'active', 'archived']).optional(),
  tagIds: z.array(z.uuid()).optional(),
})

export const Route = createFileRoute('/_authed/inventory/products/$productId')({
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { productId } }) => {
    const [productData] = await Promise.all([
      queryClient.fetchQuery(getProductQueryOptions(productId)),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
    ])
    return { crumb: productData.product.name, productData }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { productId } = Route.useParams()
  const productData = Route.useLoaderData({ select: (data) => data.productData })
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>{productData.product.name}</h2>
      <ProductForm
        productId={productId}
        existing={productData}
        onSuccess={() => navigate({ to: '/inventory', search, replace: true })}
      />
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ProductForm } from '@/components/apps/inventory/product-form'
import { title } from '@/components/ui/typography'
import {
  getInventoryTagsQueryOptions,
  getProductQueryOptions,
  getProductionCostLabelsQueryOptions,
} from '@/server/functions/inventory'

export const Route = createFileRoute('/_authed/inventory/products/$productId')({
  loader: async ({ context: { queryClient }, params: { productId } }) => {
    const [productData] = await Promise.all([
      queryClient.ensureQueryData(getProductQueryOptions(productId)),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
    ])
    return { crumb: productData.product.name, productData }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { productId } = Route.useParams()
  const { productData } = Route.useLoaderData()
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>{productData.product.name}</h2>
      <ProductForm
        productId={productId}
        existing={productData}
        onSuccess={() => navigate({ to: '/inventory' })}
      />
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import * as z from 'zod'
import { ProductFiltersSection } from '@/components/apps/inventory/product-filters-section'
import { ProductStatsSection } from '@/components/apps/inventory/product-stats-section'
import { ProductTable } from '@/components/apps/inventory/product-table'
import { Button } from '@/components/ui/button'
import { title } from '@/components/ui/typography'
import { getColumnVisibilityQueryOptions } from '@/server/functions/column-visibility'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductsQueryOptions } from '@/server/functions/inventory/products'

const LOW_STOCK_THRESHOLD = 5

const searchSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(5),
  q: z.string().optional(),
  archived: z.enum(['all', 'active', 'archived']).default('active'),
  tagIds: z.array(z.uuid()).optional(),
})

export const Route = createFileRoute('/_authed/inventory/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const [columnVisibilityProducts] = await Promise.all([
      queryClient.fetchQuery(getColumnVisibilityQueryOptions('inventory-products')),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(
        getProductsQueryOptions({
          page: search.page,
          size: search.size,
          search: search.q?.trim() || undefined,
          archived: search.archived,
          tagIds: search.tagIds,
        }),
      ),
    ])
    return { crumb: 'Products', columnVisibilityProducts }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { columnVisibilityProducts } = Route.useLoaderData({
    select: ({ columnVisibilityProducts }) => ({ columnVisibilityProducts }),
  })
  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())
  const { data: productsPage } = useSuspenseQuery(
    getProductsQueryOptions({
      page: search.page,
      size: search.size,
      search: search.q?.trim() || undefined,
      archived: search.archived,
      tagIds: search.tagIds,
    }),
  )

  const products = productsPage.items
  const { total, page, totalPages } = productsPage
  const lowStock = products.filter(
    (p) => p.kind === 'simple' && p.quantity < LOW_STOCK_THRESHOLD,
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={title({ h: 2 })}>Products</h2>
        <Button asChild>
          <Link to="/inventory/products/new">
            <Plus className="size-4" />
            Add product
          </Link>
        </Button>
      </div>

      <ProductStatsSection total={total} lowStock={lowStock} />
      <ProductTable
        products={products}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        columnVisibilityProducts={columnVisibilityProducts}
        toolbarSlot={<ProductFiltersSection search={search} navigate={navigate} tags={tags} />}
        navigate={navigate}
        emptyMessage="No products yet. Add one to get started."
      />
    </div>
  )
}

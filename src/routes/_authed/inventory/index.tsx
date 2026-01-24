import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { title } from '@/components/ui/typography'
import { getProductsQueryOptions, priceTaxIncluded } from '@/server/functions/inventory'

const LOW_STOCK_THRESHOLD = 5

export const Route = createFileRoute('/_authed/inventory/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.fetchQuery(getProductsQueryOptions({ page: 1, size: 20, archived: 'all' })),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: productsPage } = useSuspenseQuery(
    getProductsQueryOptions({ page: 1, size: 20, archived: 'all' }),
  )
  const products = productsPage.items
  const total = products.length
  const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD).length

  const columns: ColumnDef<(typeof products)[0]>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const p = row.original
        return (
          <Link
            to="/inventory/products/$productId"
            params={{ productId: p.id }}
            className="font-medium hover:underline"
          >
            {p.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => row.original.sku ?? '—',
    },
    {
      accessorKey: 'priceTaxFree',
      header: 'Price (ex. tax)',
      cell: ({ row }) => {
        const p = row.original
        return `${Number(p.priceTaxFree).toFixed(2)} €`
      },
    },
    {
      accessorKey: 'vatPercent',
      header: 'With tax',
      cell: ({ row }) => {
        const p = row.original
        return `${priceTaxIncluded(p.priceTaxFree, p.vatPercent).toFixed(2)} €`
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Stock',
      cell: ({ row }) => {
        const q = row.original.quantity
        return (
          <span className={q < LOW_STOCK_THRESHOLD ? 'font-medium text-destructive' : ''}>{q}</span>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={title({ h: 2 })}>Overview</h2>
        <Button asChild>
          <Link to="/inventory/products/new">
            <PlusIcon className="size-4" />
            Add product
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <PackageIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low stock (&lt; {LOW_STOCK_THRESHOLD})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-destructive' : ''}`}>
              {lowStock}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={products}
        emptyMessage="No products yet. Add one to get started."
        onRowClick={(row) =>
          navigate({ to: '/inventory/products/$productId', params: { productId: row.id } })
        }
      />
    </div>
  )
}

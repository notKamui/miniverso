import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as z from 'zod'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { title } from '@/components/ui/typography'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { getProductsQueryOptions, priceTaxIncluded } from '@/server/functions/inventory'

const LOW_STOCK_THRESHOLD = 5

const searchSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  archived: z.enum(['all', 'active', 'archived']).default('all'),
})

export const Route = createFileRoute('/_authed/inventory/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    await queryClient.ensureQueryData(
      getProductsQueryOptions({
        page: search.page,
        size: search.size,
        search: search.q?.trim() || undefined,
        archived: search.archived,
      }),
    )
    return {}
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [qInput, setQInput] = useState(search.q ?? '')
  const debouncedQ = useDebounce(qInput, 300)

  const { data: productsPage } = useSuspenseQuery(
    getProductsQueryOptions({
      page: search.page,
      size: search.size,
      search: search.q?.trim() || undefined,
      archived: search.archived,
    }),
  )

  useEffect(() => {
    if ((debouncedQ || undefined) !== (search.q || undefined)) {
      void navigate({
        to: '.',
        search: { ...search, q: debouncedQ || undefined, page: 1 },
      })
    }
  }, [debouncedQ, search, navigate])

  const products = productsPage.items
  const { total, page, totalPages } = productsPage
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

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name or SKU…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={search.archived}
          onValueChange={(v) =>
            navigate({
              to: '.',
              search: { ...search, archived: v as typeof search.archived, page: 1 },
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} / {totalPages} · {total} products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => navigate({ to: '.', search: { ...search, page: page - 1 } })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => navigate({ to: '.', search: { ...search, page: page + 1 } })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

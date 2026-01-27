import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Archive, ArchiveRestore, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { contrastTextForHex } from '@/lib/utils/color'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import { $updateProduct, productsQueryKey } from '@/server/functions/inventory/products'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'

const LOW_STOCK_THRESHOLD = 5

type Product = {
  id: string
  name: string
  sku?: string | null
  priceTaxFree: string | number
  vatPercent: string | number
  quantity: number
  archivedAt?: string | Date | null
  tags?: { id: string; name: string; color: string }[]
  totalProductionCost?: number
}

type ProductTableProps = {
  products: Product[]
  total: number
  page: number
  totalPages: number
  search: Record<string, unknown>
  navigate: (opts: {
    to: string
    search?: Record<string, unknown>
    params?: { productId: string }
  }) => void
  emptyMessage?: string
}

export function ProductTable({
  products,
  total,
  page,
  totalPages,
  search,
  navigate,
  emptyMessage = 'No products yet. Add one to get started.',
}: ProductTableProps) {
  const queryClient = useQueryClient()
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  const updateMut = useMutation({
    mutationFn: $updateProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
      toast.success('Product updated')
    },
  })

  const columns: ColumnDef<Product>[] = [
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
        return formatMoney(Number(p.priceTaxFree), currency)
      },
    },
    {
      accessorKey: 'vatPercent',
      header: 'With tax',
      cell: ({ row }) => {
        const p = row.original
        return formatMoney(priceTaxIncluded(p.priceTaxFree, p.vatPercent), currency)
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
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags?.length) return '—'
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: t.color,
                  color: contrastTextForHex(t.color),
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'totalProductionCost',
      header: 'Prod. cost',
      cell: ({ row }) => {
        const c = row.original.totalProductionCost ?? 0
        return formatMoney(Number(c), currency)
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original
        const isArchived = Boolean(p.archivedAt)
        return (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => updateMut.mutate({ data: { id: p.id, archivedAt: !isArchived } })}
                  disabled={updateMut.isPending}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="size-4" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        emptyMessage={emptyMessage}
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
    </>
  )
}

import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  Copy,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
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
  kind?: 'simple' | 'bundle'
  archivedAt?: string | Date | null
  tags?: { id: string; name: string; color: string }[]
  totalProductionCost?: number
  updatedAt: string | Date
}

type ProductTableProps = {
  products: Product[]
  total: number
  page: number
  search: Record<string, unknown>
  columnVisibilityProducts?: VisibilityState
  toolbarSlot?: React.ReactNode
  navigate: (opts: {
    to: string
    search?: Record<string, unknown>
    params?: { productId: string }
    replace?: boolean
  }) => void
  emptyMessage?: string
}

export function ProductTable({
  products,
  total,
  page,
  search,
  columnVisibilityProducts,
  toolbarSlot,
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

  const orderBy = (search.orderBy as 'name' | 'price' | 'updatedAt') ?? 'name'
  const order = (search.order as 'asc' | 'desc') ?? 'asc'

  type SortColumn = 'name' | 'price' | 'updatedAt'
  function getNextOrder(column: SortColumn) {
    if (orderBy === column) {
      return order === 'asc' ? 'desc' : 'asc'
    }
    return 'asc'
  }

  function OrderIndicator({ column }: { column: SortColumn }) {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" aria-hidden />
    }
    if (order === 'asc') {
      return <ArrowUp className="ml-1 size-3.5" aria-hidden />
    }
    return <ArrowDown className="ml-1 size-3.5" aria-hidden />
  }

  function SortableHeader({ column, label }: { column: SortColumn; label: string }) {
    return (
      <button
        type="button"
        className="inline-flex items-center text-sm font-medium"
        onClick={() =>
          navigate({
            to: '.',
            search: { ...search, orderBy: column, order: getNextOrder(column), page: 1 },
            replace: true,
          })
        }
      >
        {label}
        <OrderIndicator column={column} />
      </button>
    )
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: () => <SortableHeader column="name" label="Name" />,
      cell: ({ row }) => {
        const p = row.original
        return (
          <Link
            to="/inventory/products/$productId"
            params={{ productId: p.id }}
            className="font-medium hover:underline"
            title={p.name}
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
      header: () => <SortableHeader column="price" label="Price (ex. tax)" />,
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
        const p = row.original
        if (p.kind === 'bundle') return '—'
        const q = p.quantity
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
      accessorKey: 'updatedAt',
      header: () => <SortableHeader column="updatedAt" label="Last updated" />,
      cell: ({ row }) => {
        const p = row.original
        const d = new Date(p.updatedAt)
        return (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {d.toLocaleDateString()}
          </span>
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
      size: 40,
      enableHiding: false,
      meta: { stickyRight: true },
      cell: ({ row }) => {
        const p = row.original
        const isArchived = Boolean(p.archivedAt)
        return (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigate({
                      to: '/inventory/products/new',
                      search: { ...search, duplicateFrom: p.id },
                    })
                  }
                >
                  <Copy className="size-4" />
                  Duplicate
                </DropdownMenuItem>
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
        columnVisibilityStorageKey="inventory-products"
        initialColumnVisibility={columnVisibilityProducts}
        pagination={{
          page,
          pageSize: (search as { size?: number }).size ?? 5,
          total,
          onPageChange: (p) => navigate({ to: '.', search: { ...search, page: p }, replace: true }),
          onPageSizeChange: (size) =>
            navigate({ to: '.', search: { ...search, size, page: 1 }, replace: true }),
        }}
        toolbarSlot={toolbarSlot}
        onRowClick={(row) =>
          navigate({
            to: '/inventory/products/$productId',
            params: { productId: row.id },
            search,
          })
        }
      />
    </>
  )
}

import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as z from 'zod'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import { DateRangeSelect } from '@/components/ui/date-range-select'
import { Input } from '@/components/ui/input'
import { title } from '@/components/ui/typography'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import { $getOrders, getOrdersQueryOptions } from '@/server/functions/inventory/orders'

const searchSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  reference: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const Route = createFileRoute('/_authed/inventory/orders/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    await queryClient.ensureQueryData(
      getOrdersQueryOptions({
        page: search.page,
        size: search.size,
        reference: search.reference?.trim() || undefined,
        startDate: search.startDate?.trim() || undefined,
        endDate: search.endDate?.trim() || undefined,
      }),
    )
    return {}
  },
  component: RouteComponent,
})

type OrderRow = Awaited<ReturnType<typeof $getOrders>>['items'][number]

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [refInput, setRefInput] = useState(search.reference ?? '')

  const debouncedRef = useDebounce(refInput, 300)

  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  const { data: ordersPage } = useSuspenseQuery(
    getOrdersQueryOptions({
      page: search.page,
      size: search.size,
      reference: search.reference?.trim() || undefined,
      startDate: search.startDate?.trim() || undefined,
      endDate: search.endDate?.trim() || undefined,
    }),
  )

  useEffect(() => {
    if ((debouncedRef || undefined) !== (search.reference || undefined)) {
      void navigate({
        to: '.',
        search: { ...search, reference: debouncedRef || undefined, page: 1 },
      })
    }
  }, [debouncedRef, search, navigate])

  const orders = ordersPage.items
  const { total, page, totalPages } = ordersPage

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => {
        const o = row.original
        return (
          <Link
            to="/inventory/orders/$orderId"
            params={{ orderId: o.id }}
            className="font-medium hover:underline"
          >
            {o.reference}
          </Link>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={
            row.original.status === 'paid'
              ? 'text-green-600 dark:text-green-400'
              : 'text-muted-foreground'
          }
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(undefined, {
          dateStyle: 'short',
        }),
    },
    {
      accessorKey: 'totalTaxIncluded',
      header: 'Total (incl. tax)',
      cell: ({ row }) => formatMoney(Number(row.original.totalTaxIncluded), currency),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={title({ h: 2 })}>Orders</h2>
        <Button asChild>
          <Link to="/inventory/orders/new">
            <PlusIcon className="size-4" />
            New order
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Filter by reference…"
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          className="max-w-xs"
        />
        <DateRangeSelect
          startDate={search.startDate ?? ''}
          endDate={search.endDate ?? ''}
          onChange={({ startDate, endDate }) =>
            navigate({
              to: '.',
              search: { ...search, startDate, endDate, page: 1 },
            })
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        emptyMessage="No orders yet."
        onRowClick={(row) =>
          navigate({ to: '/inventory/orders/$orderId', params: { orderId: row.id } })
        }
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} / {totalPages} · {total} orders
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

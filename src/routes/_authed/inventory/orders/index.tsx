import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import { title } from '@/components/ui/typography'
import { $getOrders, getOrdersQueryOptions } from '@/server/functions/inventory'

export const Route = createFileRoute('/_authed/inventory/orders/')({
  loader: ({ context: { queryClient } }) => queryClient.fetchQuery(getOrdersQueryOptions()),
  component: RouteComponent,
})

type OrderRow = Awaited<ReturnType<typeof $getOrders>>[number] & {
  totalTaxIncluded: number
}

function RouteComponent() {
  const navigate = useNavigate()
  const { data: orders } = useSuspenseQuery(getOrdersQueryOptions())

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
      cell: ({ row }) => `${Number(row.original.totalTaxIncluded).toFixed(2)} €`,
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

      <DataTable
        columns={columns}
        data={orders as OrderRow[]}
        emptyMessage="No orders yet."
        onRowClick={(row) =>
          navigate({ to: '/inventory/orders/$orderId', params: { orderId: row.id } })
        }
      />
    </div>
  )
}

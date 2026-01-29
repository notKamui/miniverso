import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BanknoteIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { modificationLabel } from '@/components/apps/inventory/order-cart/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import {
  $deleteOrder,
  $markOrderPaid,
  $markOrderSent,
} from '@/server/functions/inventory/orders-mutations'
import { getOrderQueryOptions, ordersQueryKey } from '@/server/functions/inventory/orders-queries'
import { productsQueryKey } from '@/server/functions/inventory/products'
import { inventoryStockStatsQueryKey } from '@/server/functions/inventory/stats-stock'

type OrderItemMod = { type: string; kind: string; value: number }

function formatItemModifications(mods: OrderItemMod[] | null | undefined): string {
  if (!mods?.length) return '—'
  return mods.map((m) => modificationLabel(m as Parameters<typeof modificationLabel>[0])).join(', ')
}

type OrderDetailProps = { orderId: string }

export function OrderDetail({ orderId }: OrderDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(getOrderQueryOptions(orderId))
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())

  async function invalidateQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
      queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, orderId] }),
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
      queryClient.invalidateQueries({ queryKey: inventoryStockStatsQueryKey }),
    ])
  }

  const markPaidMut = useMutation({
    mutationFn: $markOrderPaid,
    onSuccess: async () => {
      await invalidateQueries()
      toast.success('Order marked as paid')
    },
  })
  const markSentMut = useMutation({
    mutationFn: $markOrderSent,
    onSuccess: async () => {
      await invalidateQueries()
      toast.success('Order marked as sent')
    },
  })
  const deleteMut = useMutation({
    mutationFn: $deleteOrder,
    onSuccess: async () => {
      await invalidateQueries()
      await navigate({ to: '/inventory/orders' })
      toast.success('Order deleted')
    },
  })

  const { order, items, totalTaxFree, totalTaxIncluded, totalBenefit } = data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <p className="text-sm">
            Status:{' '}
            <span
              className={
                order.status === 'paid'
                  ? 'font-medium text-green-600 dark:text-green-400'
                  : order.status === 'sent'
                    ? 'font-medium text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground'
              }
            >
              {order.status}
            </span>
          </p>
          {order.description && (
            <p className="mt-1 text-sm text-muted-foreground">{order.description}</p>
          )}
        </div>
        {order.status === 'prepared' && (
          <div className="flex gap-2">
            <Button
              onClick={() => markPaidMut.mutate({ data: { orderId } })}
              disabled={markPaidMut.isPending}
            >
              <BanknoteIcon className="size-4" />
              Mark as paid
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate({ data: { orderId } })}
              disabled={deleteMut.isPending}
            >
              <Trash2Icon className="size-4" />
              Delete
            </Button>
          </div>
        )}
        {order.status === 'paid' && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => markSentMut.mutate({ data: { orderId } })}
              disabled={markSentMut.isPending}
            >
              <SendIcon className="size-4" />
              Mark as sent
            </Button>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-medium">Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit (incl. tax)</TableHead>
              <TableHead className="text-right">Line total</TableHead>
              <TableHead>Modifications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.productName ?? 'Deleted product'}</TableCell>
                <TableCell className="text-right">{i.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(Number(i.unitPriceTaxIncluded), currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(Number(i.quantity) * Number(i.unitPriceTaxIncluded), currency)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatItemModifications(i.priceModifications)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <strong>Total (ex. tax):</strong> {formatMoney(totalTaxFree, currency)}
        </p>
        <p>
          <strong>Total (incl. tax):</strong> {formatMoney(totalTaxIncluded, currency)}
        </p>
        <p>
          <strong>Benefit (est.):</strong> {formatMoney(totalBenefit, currency)}
        </p>
      </div>
    </div>
  )
}

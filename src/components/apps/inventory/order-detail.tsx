import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BanknoteIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getOrderQueryOptions,
  $markOrderPaid,
  $deleteOrder,
  ordersQueryKey,
} from '@/server/functions/inventory'

type OrderDetailProps = { orderId: string }

export function OrderDetail({ orderId }: OrderDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useQuery(getOrderQueryOptions(orderId))
  const markPaidMut = useMutation({
    mutationFn: $markOrderPaid,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, orderId] })
      toast.success('Order marked as paid')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn: $deleteOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      toast.success('Order deleted')
      void navigate({ to: '/inventory/orders' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!data) return null
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.productName ?? 'Deleted product'}</TableCell>
                <TableCell className="text-right">{i.quantity}</TableCell>
                <TableCell className="text-right">
                  {Number(i.unitPriceTaxIncluded).toFixed(2)} €
                </TableCell>
                <TableCell className="text-right">
                  {(Number(i.quantity) * Number(i.unitPriceTaxIncluded)).toFixed(2)} €
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <strong>Total (ex. tax):</strong> {totalTaxFree.toFixed(2)} €
        </p>
        <p>
          <strong>Total (incl. tax):</strong> {totalTaxIncluded.toFixed(2)} €
        </p>
        <p>
          <strong>Benefit (est.):</strong> {totalBenefit.toFixed(2)} €
        </p>
      </div>
    </div>
  )
}

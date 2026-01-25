import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney, getCurrencySymbol } from '@/lib/utils/format-money'
import {
  $createCash,
  $deleteCash,
  $reorderCashRow,
  $updateCash,
  getCashQueryOptions,
  inventoryCashQueryKey,
} from '@/server/functions/inventory/cash'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'

export function CashTable() {
  const queryClient = useQueryClient()
  const { data: rows = [] } = useSuspenseQuery(getCashQueryOptions())
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())

  const createMut = useMutation({
    mutationFn: $createCash,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryCashQueryKey })
      toast.success('Row added')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: $updateCash,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryCashQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: $deleteCash,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryCashQueryKey })
      toast.success('Row deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reorderMut = useMutation({
    mutationFn: $reorderCashRow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryCashQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const total = rows.reduce((sum, r) => sum + Number(r.value) * r.quantity, 0)

  function handleBlurLabel(row: (typeof rows)[0], value: string) {
    const v = value.trim()
    if (v && v !== row.label) updateMut.mutate({ data: { id: row.id, label: v } })
  }

  function handleBlurValue(row: (typeof rows)[0], value: string) {
    const n = Number.parseFloat(value)
    if (!Number.isNaN(n) && n >= 0 && n !== Number(row.value))
      updateMut.mutate({ data: { id: row.id, value: n } })
  }

  function handleBlurQuantity(row: (typeof rows)[0], value: string) {
    const n = Math.floor(Number.parseFloat(value))
    if (!Number.isNaN(n) && n >= 0 && n !== row.quantity)
      updateMut.mutate({ data: { id: row.id, quantity: n } })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            createMut.mutate({
              data: { label: 'New', value: 0, quantity: 0 },
            })
          }
          disabled={createMut.isPending}
        >
          <PlusIcon className="size-4" />
          Add row
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead className="w-28">Value ({getCurrencySymbol(currency)})</TableHead>
            <TableHead className="w-28">Quantity</TableHead>
            <TableHead className="w-32 text-right">Total</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No rows. Click &quot;Add row&quot; to start.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={`${row.id}-${row.label}-${String(row.value)}-${row.quantity}-${row.sortOrder}`}
              >
                <TableCell className="p-1">
                  <Input
                    defaultValue={row.label}
                    onBlur={(e) => handleBlurLabel(row, e.target.value)}
                    className="h-8 border-0 bg-transparent focus-visible:ring-1"
                    placeholder={`e.g. 1 ${getCurrencySymbol(currency)} coin`}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={Number(row.value)}
                    onBlur={(e) => handleBlurValue(row, e.target.value)}
                    className="h-8 w-24 border-0 bg-transparent focus-visible:ring-1"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={row.quantity}
                    onBlur={(e) => handleBlurQuantity(row, e.target.value)}
                    className="h-8 w-24 border-0 bg-transparent focus-visible:ring-1"
                  />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(Number(row.value) * row.quantity, currency)}
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => reorderMut.mutate({ data: { id: row.id, direction: 'up' } })}
                      disabled={index === 0 || reorderMut.isPending}
                      aria-label="Move up"
                    >
                      <ChevronUpIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => reorderMut.mutate({ data: { id: row.id, direction: 'down' } })}
                      disabled={index === rows.length - 1 || reorderMut.isPending}
                      aria-label="Move down"
                    >
                      <ChevronDownIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        if (window.confirm('Delete this row?')) {
                          deleteMut.mutate({ data: { id: row.id } })
                        }
                      }}
                      disabled={deleteMut.isPending}
                      aria-label="Delete row"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-right font-medium">
                Total
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {formatMoney(total, currency)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}

import { Trash2Icon } from 'lucide-react'
import type { ReactForm } from '@/lib/utils/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/utils/format-money'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'
import type { CartItem, OrderCartFormValues } from './types'
import { effectivePriceTaxFree } from './utils'

export function OrderCartItemsList({
  form,
  currency,
}: {
  form: ReactForm<OrderCartFormValues>
  currency: string
}) {
  return (
    <form.Field name="items">
      {(field) => {
        const items = field.state.value ?? []
        return (
          <div className="space-y-2">
            <Label>Items</Label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items. Add products above.</p>
            ) : (
              <ul className="space-y-2 rounded-md border p-2">
                {items.map((i: CartItem) => (
                  <li key={i.productId} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {i.name} × {i.quantity} ={' '}
                      {formatMoney(
                        priceTaxIncluded(effectivePriceTaxFree(i), i.vatPercent) * i.quantity,
                        currency,
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        field.handleChange(items.filter((it) => it.productId !== i.productId))
                      }}
                      aria-label="Remove"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </form.Field>
  )
}

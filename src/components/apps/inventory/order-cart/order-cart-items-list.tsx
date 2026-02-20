import { Label } from '@/components/ui/label'
import type { ReactForm } from '@/lib/utils/types'
import { OrderCartItemRow } from './order-cart-item-row'
import type { CartItem, OrderCartFormValues, Preset, PriceModification } from './types'

export function OrderCartItemsList({
  form,
  currency,
  presets,
  onSavePresetClick,
}: {
  form: ReactForm<OrderCartFormValues>
  currency: string
  presets: Preset[]
  onSavePresetClick: (mod: PriceModification) => void
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
              <ul className="space-y-3 rounded-md border p-2">
                {items.map((i: CartItem, index: number) => (
                  <OrderCartItemRow
                    key={i.productId}
                    item={i}
                    index={index}
                    items={items}
                    currency={currency}
                    onItemsChange={field.handleChange}
                    presets={presets}
                    onSavePresetClick={onSavePresetClick}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </form.Field>
  )
}

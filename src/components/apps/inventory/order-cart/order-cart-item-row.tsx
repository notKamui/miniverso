import { Trash2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils/format-money'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'
import { AddModificationPopover } from './add-modification-popover'
import type { CartItem, Preset, PriceModification } from './types'
import { effectivePriceTaxFree, modificationLabel } from './utils'

export function OrderCartItemRow({
  item,
  index,
  items,
  currency,
  onItemsChange,
  presets,
  onSavePresetClick,
}: {
  item: CartItem
  index: number
  items: CartItem[]
  currency: string
  onItemsChange: (newItems: CartItem[]) => void
  presets: Preset[]
  onSavePresetClick: (mod: PriceModification) => void
}) {
  const mods = item.modifications ?? []

  return (
    <li className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>
          {item.name} × {item.quantity} ={' '}
          {formatMoney(
            priceTaxIncluded(effectivePriceTaxFree(item), item.vatPercent) * item.quantity,
            currency,
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onItemsChange(items.filter((_, idx) => idx !== index))}
          aria-label="Remove line"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-0">
        {mods.map((m, modIndex) => (
          <span
            key={modIndex}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
          >
            {modificationLabel(m)}
            <button
              type="button"
              onClick={() => {
                const newItems = [...items]
                const current = newItems[index]
                if (!current) return
                newItems[index] = {
                  ...current,
                  modifications: (current.modifications ?? []).filter((_, j) => j !== modIndex),
                }
                onItemsChange(newItems)
              }}
              className="rounded p-0.5 hover:bg-muted-foreground/20"
              aria-label="Remove modification"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <AddModificationPopover
          itemIndex={index}
          items={items}
          onItemsChange={onItemsChange}
          presets={presets}
          onSavePresetClick={onSavePresetClick}
        />
      </div>
    </li>
  )
}

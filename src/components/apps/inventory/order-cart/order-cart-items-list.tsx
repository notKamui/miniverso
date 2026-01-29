import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactForm } from '@/lib/utils/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '@/lib/utils/format-money'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'
import type { CartItem, OrderCartFormValues, Preset, PriceModification } from './types'
import { PresetCombobox } from './comboboxes'
import {
  effectivePriceTaxFree,
  modificationLabel,
  presetLabel,
  presetToModification,
} from './utils'

function AddModificationPopover({
  itemIndex,
  items,
  onItemsChange,
  presets,
  onSavePresetClick,
}: {
  itemIndex: number
  items: CartItem[]
  onItemsChange: (newItems: CartItem[]) => void
  presets: Preset[]
  onSavePresetClick: (mod: PriceModification) => void
}) {
  const [open, setOpen] = useState(false)
  const [mod, setMod] = useState<PriceModification>({
    type: 'decrease',
    kind: 'relative',
    value: 0,
  })

  function addModification() {
    const value = mod.value
    if (value <= 0) return
    const newItems = [...items]
    const current = newItems[itemIndex]
    if (!current) return
    newItems[itemIndex] = {
      ...current,
      modifications: [...(current.modifications ?? []), { ...mod, value }],
    }
    onItemsChange(newItems)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PlusIcon className="size-4" />
          Add modification
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Preset</Label>
            <PresetCombobox.Root
              items={presets}
              value={null}
              onValueChange={(p) => {
                if (p) {
                  const m = presetToModification(p)
                  setMod(m)
                }
              }}
              itemToStringLabel={presetLabel}
            >
              <PresetCombobox.Input placeholder="Apply preset…" className="h-9 w-full" />
              <PresetCombobox.Content>
                <PresetCombobox.List>
                  {(p) => (
                    <PresetCombobox.Item key={p.id} value={p}>
                      {presetLabel(p)}
                    </PresetCombobox.Item>
                  )}
                </PresetCombobox.List>
                <PresetCombobox.Empty>No presets.</PresetCombobox.Empty>
              </PresetCombobox.Content>
            </PresetCombobox.Root>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={mod.type}
                onValueChange={(v) =>
                  setMod((m) => ({ ...m, type: v as PriceModification['type'] }))
                }
              >
                <SelectTrigger className="h-9 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label className="text-xs">Kind</Label>
              <Select
                value={mod.kind}
                onValueChange={(v) =>
                  setMod((m) => ({ ...m, kind: v as PriceModification['kind'] }))
                }
              >
                <SelectTrigger className="h-9 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="relative">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                min={0}
                step={mod.kind === 'relative' ? 1 : 0.01}
                value={mod.value || ''}
                onChange={(e) =>
                  setMod((m) => ({ ...m, value: Number.parseFloat(e.target.value) || 0 }))
                }
                className="h-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={addModification} disabled={mod.value <= 0}>
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onSavePresetClick(mod)
                setOpen(false)
              }}
              disabled={mod.value <= 0}
            >
              Save as preset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

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
                {items.map((i: CartItem, index: number) => {
                  const mods = i.modifications ?? []
                  return (
                    <li key={i.productId} className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
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
                            field.handleChange(items.filter((_, idx) => idx !== index))
                          }}
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
                                  modifications: (current.modifications ?? []).filter(
                                    (_, j) => j !== modIndex,
                                  ),
                                }
                                field.handleChange(newItems)
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
                          onItemsChange={field.handleChange}
                          presets={presets}
                          onSavePresetClick={onSavePresetClick}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      }}
    </form.Field>
  )
}

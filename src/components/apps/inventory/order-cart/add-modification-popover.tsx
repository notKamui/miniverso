import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
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
import { PresetCombobox } from './comboboxes'
import type { CartItem, Preset, PriceModification } from './types'
import { presetLabel, presetToModification } from './utils'

export function AddModificationPopover({
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

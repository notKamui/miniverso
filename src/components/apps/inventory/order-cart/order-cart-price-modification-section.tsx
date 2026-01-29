import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '@/lib/utils/format-money'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'
import type { CartItem, PriceModification, Preset } from './types'
import { PresetCombobox } from './comboboxes'
import { effectivePriceTaxFree, presetLabel } from './utils'

export function OrderCartPriceModificationSection({
  presets,
  modification,
  setModification,
  selectedPreset,
  onApplyPreset,
  onApplyModification,
  onClearModification,
  onSavePresetClick,
  list,
  currency,
}: {
  presets: Preset[]
  modification: PriceModification
  setModification: React.Dispatch<React.SetStateAction<PriceModification>>
  selectedPreset: Preset | null
  onApplyPreset: (p: Preset | null) => void
  onApplyModification: () => void
  onClearModification: () => void
  onSavePresetClick: () => void
  list: CartItem[]
  currency: string
}) {
  const totalTaxFree = list.reduce((s, i) => s + effectivePriceTaxFree(i) * i.quantity, 0)
  const totalTaxIncluded = list.reduce(
    (s, i) => s + priceTaxIncluded(effectivePriceTaxFree(i), i.vatPercent) * i.quantity,
    0,
  )
  const hasItems = list.length > 0
  const hasModification = list.some((i) => i.unitPriceTaxFree !== undefined)

  return (
    <>
      {hasItems && (
        <div className="space-y-2">
          <Label>Price modification</Label>
          <div className="rounded-md border p-3">
            <div className="grid grid-cols-[auto_auto_auto_auto_1fr] items-center gap-x-2 gap-y-1">
              <Label className="text-xs text-muted-foreground">Preset</Label>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Label className="text-xs text-muted-foreground">Kind</Label>
              <Label className="text-xs text-muted-foreground">Value</Label>
              <div />
              <PresetCombobox.Root
                items={presets}
                value={selectedPreset}
                onValueChange={onApplyPreset}
                itemToStringLabel={presetLabel}
              >
                <PresetCombobox.Input placeholder="Apply preset…" className="w-44" />
                <PresetCombobox.Content>
                  <PresetCombobox.List>
                    {(p) => (
                      <PresetCombobox.Item key={p.id} value={p}>
                        {presetLabel(p)}
                      </PresetCombobox.Item>
                    )}
                  </PresetCombobox.List>
                  <PresetCombobox.Empty>No presets. Add in Settings.</PresetCombobox.Empty>
                </PresetCombobox.Content>
              </PresetCombobox.Root>
              <Select
                value={modification.type}
                onValueChange={(v) =>
                  setModification((m) => ({ ...m, type: v as PriceModification['type'] }))
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={modification.kind}
                onValueChange={(v) =>
                  setModification((m) => ({ ...m, kind: v as PriceModification['kind'] }))
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="relative">%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step={modification.kind === 'relative' ? 1 : 0.01}
                value={modification.value || ''}
                onChange={(e) =>
                  setModification((m) => ({
                    ...m,
                    value: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-20"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onApplyModification}
                  disabled={list.length === 0}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearModification}
                  disabled={!hasModification}
                >
                  Clear
                </Button>
                {hasModification && (
                  <Button type="button" variant="outline" size="sm" onClick={onSavePresetClick}>
                    Save as preset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {list.length > 0 ? (
        <div className="text-sm">
          <p>
            <strong>Total (ex. tax):</strong> {formatMoney(totalTaxFree, currency)}
          </p>
          <p>
            <strong>Total (incl. tax):</strong> {formatMoney(totalTaxIncluded, currency)}
          </p>
        </div>
      ) : null}
    </>
  )
}

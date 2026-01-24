import type { RefObject } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LabelOption = { id: string; name: string; color: string }

type CreateLabelMutation = {
  mutate: (opts: { data: { name: string; color: string } }) => void
  isPending: boolean
}

type Props = {
  form: ReactForm<ProductFormValues>
  labels: LabelOption[]
  newLabelName: string
  setNewLabelName: (v: string) => void
  createLabelMut: CreateLabelMutation
  productionCostsSetRef: RefObject<((v: { labelId: string; amount: string }[]) => void) | null>
}

export function ProductFormProductionCosts({
  form,
  labels,
  newLabelName,
  setNewLabelName,
  createLabelMut,
  productionCostsSetRef,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Production costs</Label>
        <div className="flex gap-2">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="New label"
            className="max-w-[140px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const n = newLabelName.trim()
              if (n) createLabelMut.mutate({ data: { name: n, color: '#6b7280' } })
            }}
            disabled={!newLabelName.trim() || createLabelMut.isPending}
          >
            Create label
          </Button>
        </div>
      </div>
      <form.Field name="productionCosts" mode="array">
        {(field) => {
          productionCostsSetRef.current = field.handleChange
          const rows = field.state.value ?? []
          return (
            <div className="space-y-2">
              {rows.map((_, i) => (
                <div key={i} className="flex gap-2">
                  <form.Field name={`productionCosts[${i}].labelId`}>
                    {(lf) => (
                      <div className="flex-1">
                        <Combobox
                          value={lf.state.value || null}
                          onValueChange={(v) => lf.handleChange(v ?? '')}
                          itemToStringLabel={(id) => {
                            const l = labels.find((x) => x.id === id)
                            return l ? l.name : String(id ?? '')
                          }}
                        >
                          <ComboboxInput placeholder="Label" />
                          <ComboboxContent>
                            <ComboboxList>
                              {labels.map((l) => (
                                <ComboboxItem key={l.id} value={l.id}>
                                  {l.name}
                                </ComboboxItem>
                              ))}
                              <ComboboxEmpty>No labels. Add one above.</ComboboxEmpty>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </div>
                    )}
                  </form.Field>
                  <form.Field name={`productionCosts[${i}].amount`}>
                    {(af) => (
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Amount"
                        value={af.state.value ?? ''}
                        onChange={(e) => af.handleChange(e.target.value)}
                        className="w-28"
                      />
                    )}
                  </form.Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => field.handleChange(rows.filter((_, idx) => idx !== i))}
                    aria-label="Remove"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  field.pushValue({
                    labelId: labels[0]?.id ?? '',
                    amount: '0',
                  })
                }}
              >
                <PlusIcon className="size-4" />
                Add
              </Button>
            </div>
          )
        }}
      </form.Field>
    </div>
  )
}

import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createCombobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'

type LabelOption = { id: string; name: string; color: string }

type Props = {
  form: ReactForm<ProductFormValues>
  labels: LabelOption[]
}

const LabelCombobox = createCombobox<LabelOption>()

export function ProductFormProductionCosts({ form, labels }: Props) {
  return (
    <div className="space-y-2">
      <Label>Production costs</Label>
      <form.Field name="productionCosts" mode="array">
        {(field) => {
          const rows = field.state.value ?? []
          return (
            <div className="space-y-2">
              {rows.map((_, i) => (
                <div key={i} className="flex gap-2">
                  <form.Field name={`productionCosts[${i}].labelId`}>
                    {(lf) => (
                      <div className="flex-1">
                        <LabelCombobox.Root
                          items={labels}
                          value={labels.find((l) => l.id === lf.state.value) ?? null}
                          onValueChange={(v) => lf.handleChange(v?.id ?? '')}
                          itemToStringLabel={(l) => l.name}
                        >
                          <LabelCombobox.Input placeholder="Label" />
                          <LabelCombobox.Content>
                            <LabelCombobox.List>
                              {(l) => (
                                <LabelCombobox.Item key={l.id} value={l}>
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="size-2 shrink-0 rounded-sm"
                                      style={{ backgroundColor: l.color }}
                                      aria-hidden
                                    />
                                    {l.name}
                                  </span>
                                </LabelCombobox.Item>
                              )}
                            </LabelCombobox.List>
                            <LabelCombobox.Empty>No labels.</LabelCombobox.Empty>
                          </LabelCombobox.Content>
                        </LabelCombobox.Root>
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

import type { RefObject } from 'react'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { contrastTextForHex } from '@/lib/utils/color'

type Tag = { id: string; name: string; color: string }

type Props = {
  form: ReactForm<ProductFormValues>
  tags: Tag[]
  chipsAnchorRef: RefObject<HTMLDivElement | null>
}

export function ProductFormTagIds({ form, tags, chipsAnchorRef }: Props) {
  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <form.Field name="tagIds">
        {(field) => (
          <Combobox
            multiple
            value={field.state.value ?? []}
            onValueChange={(v) => field.handleChange(Array.isArray(v) ? v : [])}
          >
            <ComboboxChips ref={chipsAnchorRef}>
              {(field.state.value ?? []).map((id) => {
                const t = tags.find((x) => x.id === id)
                return (
                  <ComboboxChip
                    key={id}
                    style={
                      t?.color
                        ? {
                            backgroundColor: t.color,
                            color: contrastTextForHex(t.color),
                          }
                        : undefined
                    }
                  >
                    {t?.name ?? id}
                  </ComboboxChip>
                )
              })}
              <ComboboxChipsInput placeholder="Add tag…" />
            </ComboboxChips>
            <ComboboxContent anchor={chipsAnchorRef}>
              <ComboboxList>
                {tags.map((t) => (
                  <ComboboxItem key={t.id} value={t.id}>
                    {t.name}
                  </ComboboxItem>
                ))}
                <ComboboxEmpty>No tags.</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      </form.Field>
    </div>
  )
}

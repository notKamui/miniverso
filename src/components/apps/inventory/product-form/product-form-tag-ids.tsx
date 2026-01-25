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
        {(field) => {
          const tagIds = field.state.value ?? []
          const selectedTags = tags.filter((t) => tagIds.includes(t.id))
          return (
            <Combobox
              multiple
              items={tags}
              value={selectedTags}
              onValueChange={(v) => field.handleChange(Array.isArray(v) ? v.map((t) => t.id) : [])}
              itemToStringLabel={(t) => t.name}
            >
              <ComboboxChips ref={chipsAnchorRef}>
                {selectedTags.map((t) => (
                  <ComboboxChip
                    key={t.id}
                    style={
                      t.color
                        ? {
                            backgroundColor: t.color,
                            color: contrastTextForHex(t.color),
                          }
                        : undefined
                    }
                  >
                    {t.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder="Add tag…" />
              </ComboboxChips>
              <ComboboxContent anchor={chipsAnchorRef}>
                <ComboboxList<Tag>>
                  {(t) => (
                    <ComboboxItem key={t.id} value={t}>
                      {t.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>No tags.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          )
        }}
      </form.Field>
    </div>
  )
}

import type { RefObject } from 'react'
import { createCombobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import type { ProductFormValues } from '@/lib/forms/product'
import { contrastTextForHex } from '@/lib/utils/color'
import type { ReactForm } from '@/lib/utils/types'

type Tag = { id: string; name: string; color: string }

type Props = {
  form: ReactForm<ProductFormValues>
  tags: Tag[]
  chipsAnchorRef: RefObject<HTMLDivElement | null>
}

const TagCombobox = createCombobox<Tag, true>()

export function ProductFormTagIds({ form, tags, chipsAnchorRef }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tagIds">Tags</Label>
      <form.Field name="tagIds">
        {(field) => {
          const tagIds = field.state.value ?? []
          const selectedTags = tags.filter((t) => tagIds.includes(t.id))
          return (
            <TagCombobox.Root
              name="tagIds"
              id="tagIds"
              multiple
              items={tags}
              value={selectedTags}
              onValueChange={(v) => field.handleChange(v.map((t) => t.id))}
              itemToStringLabel={(t) => t.name}
            >
              <TagCombobox.Chips ref={chipsAnchorRef}>
                {selectedTags.map((t) => (
                  <TagCombobox.Chip
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
                  </TagCombobox.Chip>
                ))}
                <TagCombobox.ChipsInput placeholder="Add tag…" />
              </TagCombobox.Chips>
              <TagCombobox.Content anchor={chipsAnchorRef}>
                <TagCombobox.List>
                  {(t) => (
                    <TagCombobox.Item key={t.id} value={t}>
                      {t.name}
                    </TagCombobox.Item>
                  )}
                </TagCombobox.List>
                <TagCombobox.Empty>No tags.</TagCombobox.Empty>
              </TagCombobox.Content>
            </TagCombobox.Root>
          )
        }}
      </form.Field>
    </div>
  )
}

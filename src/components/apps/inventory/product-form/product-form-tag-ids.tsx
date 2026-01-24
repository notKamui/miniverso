import type { RefObject } from 'react'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tag = { id: string; name: string; color: string }

type CreateTagMutation = {
  mutate: (opts: { data: { name: string; color: string } }) => void
  isPending: boolean
}

type Props = {
  form: ReactForm<ProductFormValues>
  tags: Tag[]
  newTagName: string
  setNewTagName: (v: string) => void
  createTagMut: CreateTagMutation
  tagIdsSetRef: RefObject<((v: string[]) => void) | null>
  chipsAnchorRef: RefObject<HTMLDivElement | null>
}

export function ProductFormTagIds({
  form,
  tags,
  newTagName,
  setNewTagName,
  createTagMut,
  tagIdsSetRef,
  chipsAnchorRef,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <form.Field name="tagIds">
        {(field) => {
          tagIdsSetRef.current = field.handleChange
          return (
            <>
              <Combobox
                multiple
                value={field.state.value ?? []}
                onValueChange={(v) => field.handleChange(Array.isArray(v) ? v : [])}
              >
                <ComboboxChips ref={chipsAnchorRef}>
                  {(field.state.value ?? []).map((id) => {
                    const t = tags.find((x) => x.id === id)
                    return <ComboboxChip key={id}>{t?.name ?? id}</ComboboxChip>
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
                    <ComboboxEmpty>No tags. Add one below.</ComboboxEmpty>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name"
                  className="max-w-[200px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const n = newTagName.trim()
                    if (n) createTagMut.mutate({ data: { name: n, color: '#6b7280' } })
                  }}
                  disabled={!newTagName.trim() || createTagMut.isPending}
                >
                  Create tag
                </Button>
              </div>
            </>
          )
        }}
      </form.Field>
    </div>
  )
}

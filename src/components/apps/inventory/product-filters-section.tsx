import { useEffect, useState } from 'react'
import { Section } from '@/components/apps/inventory/section'
import { createCombobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { contrastTextForHex } from '@/lib/utils/color'

type InventoryTag = { id: string; name: string; color: string }
const TagCombobox = createCombobox<InventoryTag, true>()

type ProductFiltersSectionProps = {
  search: { q?: string; archived: string; tagIds?: string[]; page: number; size: number }
  navigate: (opts: { to: string; search: Record<string, unknown> }) => void
  tags: InventoryTag[]
}

export function ProductFiltersSection({ search, navigate, tags }: ProductFiltersSectionProps) {
  const [qInput, setQInput] = useState(search.q ?? '')
  const debouncedQ = useDebounce(qInput, 300)
  const tagFilterAnchorRef = TagCombobox.useAnchor()

  useEffect(() => {
    setQInput(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    if ((debouncedQ || undefined) !== (search.q || undefined)) {
      void navigate({
        to: '.',
        search: { ...search, q: debouncedQ || undefined, page: 1 },
      })
    }
  }, [debouncedQ, search, navigate])

  return (
    <Section title="Filters" description="Search, status, and tag filters." collapsible={false}>
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by name or SKU…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={search.archived}
          onValueChange={(v) =>
            navigate({
              to: '.',
              search: { ...search, archived: v, page: 1 },
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <TagCombobox.Root
          multiple
          items={tags}
          value={tags.filter((t) => (search.tagIds ?? []).includes(t.id))}
          onValueChange={(v) =>
            navigate({
              to: '.',
              search: { ...search, tagIds: v.length > 0 ? v.map((t) => t.id) : undefined, page: 1 },
            })
          }
          itemToStringLabel={(t) => t.name}
        >
          <TagCombobox.Chips ref={tagFilterAnchorRef} className="max-w-64 min-w-32">
            {tags
              .filter((t) => (search.tagIds ?? []).includes(t.id))
              .map((t) => (
                <TagCombobox.Chip
                  key={t.id}
                  style={
                    t.color
                      ? { backgroundColor: t.color, color: contrastTextForHex(t.color) }
                      : undefined
                  }
                >
                  {t.name}
                </TagCombobox.Chip>
              ))}
            <TagCombobox.ChipsInput placeholder="Filter by tag…" />
          </TagCombobox.Chips>
          <TagCombobox.Content anchor={tagFilterAnchorRef}>
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
      </div>
    </Section>
  )
}

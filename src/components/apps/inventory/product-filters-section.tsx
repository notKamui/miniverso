import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const selectedTags = tags.filter((t) => (search.tagIds ?? []).includes(t.id))
  const visibleTags = selectedTags.slice(0, 2)
  const hiddenCount = Math.max(0, selectedTags.length - visibleTags.length)

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
    <div className="flex items-center gap-2">
      <Input
        name="q"
        placeholder="Search by name or SKU…"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        className="max-w-lg min-w-sm"
      />
      <Select
        name="archived"
        value={search.archived}
        onValueChange={(v) =>
          navigate({
            to: '.',
            search: { ...search, archived: v, page: 1 },
          })
        }
      >
        <SelectTrigger className="min-w-32">
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
        <div className="flex items-center gap-1">
          <TagCombobox.Chips
            ref={tagFilterAnchorRef}
            className="h-9 max-w-64 min-w-0 flex-nowrap overflow-hidden"
          >
            {visibleTags.map((t) => (
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
            {hiddenCount > 0 ? (
              <TagCombobox.Chip
                showRemove={false}
                className="cursor-pointer"
                title={`${hiddenCount} more`}
              >
                +{hiddenCount}
              </TagCombobox.Chip>
            ) : null}
            <TagCombobox.ChipsInput placeholder="Tag…" name="tagIds" className="min-w-0" />
          </TagCombobox.Chips>
          {selectedTags.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="h-9 w-9"
              onClick={() =>
                navigate({ to: '.', search: { ...search, tagIds: undefined, page: 1 } })
              }
              aria-label="Clear tag filter"
              title="Clear tag filter"
            >
              ×
            </Button>
          ) : null}
        </div>
        <TagCombobox.Content anchor={tagFilterAnchorRef}>
          <TagCombobox.List>
            {(t) => (
              <TagCombobox.Item key={t.id} value={t}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: t.color }}
                    aria-hidden
                  />
                  {t.name}
                </span>
              </TagCombobox.Item>
            )}
          </TagCombobox.List>
          <TagCombobox.Empty>No tags.</TagCombobox.Empty>
        </TagCombobox.Content>
      </TagCombobox.Root>
    </div>
  )
}

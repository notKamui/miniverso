import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import type { TimeEntryTag } from '@/server/db/schema/time'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  $deleteTimeEntryTag,
  getTimeEntryTagsQueryOptions,
  timeEntryTagsQueryKey,
} from '@/server/functions/time-entry'

type TagSelectorProps = {
  onSelectTag: (tag: TimeEntryTag) => void
  disabled?: boolean
}

export function TagSelector({ onSelectTag, disabled = false }: TagSelectorProps) {
  const queryClient = useQueryClient()
  const { data: tags = [] } = useQuery(getTimeEntryTagsQueryOptions())

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => $deleteTimeEntryTag({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: timeEntryTagsQueryKey })
      const previousTags = queryClient.getQueryData<TimeEntryTag[]>(timeEntryTagsQueryKey)
      queryClient.setQueryData<TimeEntryTag[]>(
        timeEntryTagsQueryKey,
        (old) => old?.filter((tag) => tag.id !== id) ?? [],
      )
      return { previousTags }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(timeEntryTagsQueryKey, context.previousTags)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: timeEntryTagsQueryKey })
    },
  })

  function handleSelectTag(tag: TimeEntryTag) {
    onSelectTag(tag)
  }

  function handleDeleteTag(e: React.MouseEvent, tagId: string) {
    e.stopPropagation()
    deleteTagMutation.mutate(tagId)
  }

  return (
    <Combobox
      items={tags}
      value={null}
      onValueChange={(v) => {
        if (v) handleSelectTag(v)
      }}
      itemToStringLabel={(t: TimeEntryTag | null) => (t ? t.description : '')}
    >
      <ComboboxInput placeholder="Select tag…" disabled={disabled} />
      <ComboboxContent>
        <ComboboxList<TimeEntryTag>>
          {(tag) => (
            <ComboboxItem key={tag.id} value={tag} className="flex items-center gap-2">
              <span className="flex-1 truncate">{tag.description}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100"
                onClick={(e) => handleDeleteTag(e, tag.id)}
                disabled={deleteTagMutation.isPending}
                aria-label="Delete tag"
              >
                <Trash2Icon className="size-3.5 text-destructive" />
              </Button>
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>
          No tags saved yet. Type a description and click &quot;Save as tag&quot; to create one.
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}

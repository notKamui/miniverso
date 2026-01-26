import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TagIcon, Trash2Icon } from 'lucide-react'
import type { TimeEntryTag } from '@/server/db/schema/time'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'
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

  function handleKeyDown(e: React.KeyboardEvent, tag: TimeEntryTag) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelectTag(tag)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label="Select tag"
        >
          <TagIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {tags.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            <p>No tags saved yet.</p>
            <p className="mt-1">
              Type a description and click &quot;Save as tag&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => handleSelectTag(tag)}
                onKeyDown={(e) => handleKeyDown(e, tag)}
                role="button"
                tabIndex={0}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-within:bg-accent focus-within:text-accent-foreground',
                  'focus:outline-none',
                )}
              >
                <span className="flex-1 truncate text-left">{tag.description}</span>
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
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

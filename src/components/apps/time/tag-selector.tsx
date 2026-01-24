import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SearchIcon, TagIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import type { TimeEntryTag } from '@/server/db/schema/time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredTags = tags.filter((tag) =>
    tag.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  function handleSelectTag(tag: TimeEntryTag) {
    onSelectTag(tag)
    setPopoverOpen(false)
    setSearchQuery('')
  }

  function handleDeleteTag(e: React.MouseEvent, tagId: string) {
    e.stopPropagation()
    deleteTagMutation.mutate(tagId)
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Saved Tags</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setPopoverOpen(false)
                setSearchQuery('')
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tags saved yet. Type a description and click &quot;Save as tag&quot; to create one.
            </p>
          ) : filteredTags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tags match your search.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  role="button"
                  tabIndex={0}
                  className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelectTag(tag)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectTag(tag)
                    }
                  }}
                >
                  <span className="flex-1 truncate">{tag.description}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
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
        </div>
      </PopoverContent>
    </Popover>
  )
}

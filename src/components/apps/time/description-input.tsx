import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatedSpinner } from '@/components/ui/animated-spinner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { TimeEntry } from '@/server/db/schema/time'
import {
  $createTimeEntryTag,
  getTimeEntryTagsQueryOptions,
  timeEntryTagsQueryKey,
} from '@/server/functions/time-entry'

type DescriptionInputProps = {
  description: string
  onDescriptionChange: (value: string) => void
  disabled?: boolean
  entryKey: string
  currentEntry: TimeEntry | null
}

export function DescriptionInput({
  description,
  onDescriptionChange,
  disabled = false,
  entryKey,
  currentEntry,
}: DescriptionInputProps) {
  const queryClient = useQueryClient()
  const { data: tags = [] } = useQuery(getTimeEntryTagsQueryOptions())

  const trimmedDescription = description.trim()
  const tagExists = tags.some((tag) => tag.description.trim() === trimmedDescription)

  const createTagMutation = useMutation({
    mutationFn: (description: string) => $createTimeEntryTag({ data: { description } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: timeEntryTagsQueryKey })
    },
  })

  const isSaveAsTagDisabled =
    trimmedDescription.length === 0 ||
    Boolean(currentEntry) ||
    tagExists ||
    createTagMutation.isPending

  async function onSaveAsTag() {
    if (!trimmedDescription) return
    await createTagMutation.mutateAsync(trimmedDescription)
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        key={entryKey}
        className="grow resize-none"
        value={description}
        onChange={(e) => {
          onDescriptionChange(e.target.value)
        }}
        placeholder="Description"
        disabled={disabled}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveAsTag}
        disabled={isSaveAsTagDisabled}
        className="w-full"
      >
        <span className="flex items-center gap-2">
          <AnimatedSpinner show={createTagMutation.isPending} />
          Save as tag
        </span>
      </Button>
    </div>
  )
}

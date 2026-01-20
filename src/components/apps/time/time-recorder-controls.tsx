import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { TagIcon, Trash2Icon, XIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'
import { AnimatedSpinner } from '@/components/ui/animated-spinner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { title } from '@/components/ui/typography'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useNow } from '@/lib/hooks/use-now'
import { createOptimisticMutationHelpers } from '@/lib/hooks/use-optimistic-mutation'
import { cn } from '@/lib/utils/cn'
import { Time } from '@/lib/utils/time'
import type { TimeEntry, TimeEntryTag } from '@/server/db/schema/time'
import {
  $createTimeEntry,
  $createTimeEntryTag,
  $deleteTimeEntryTag,
  $updateTimeEntry,
  getTimeEntryTagsQueryOptions,
  timeEntriesQueryKey,
  timeEntryTagsQueryKey,
  timeStatsQueryKey,
} from '@/server/functions/time-entry'

export type TimeRecorderControlsProps = {
  entries: TimeEntry[]
  className?: string
}

function useTimeTableControls(entries: TimeRecorderControlsProps['entries']) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(() => {
    const lastEntry = entries[0]
    if (lastEntry?.endedAt) return null
    return lastEntry ?? null
  })

  const currentEntryIdRef = useRef<string | null>(currentEntry?.id ?? null)

  useEffect(() => {
    const currentId = currentEntryIdRef.current

    if (currentId) {
      const entry = entries.find((e) => e.id === currentId)
      if (!entry || entry.endedAt) {
        setCurrentEntry(null)
        currentEntryIdRef.current = null
      } else {
        setCurrentEntry(entry)
      }
      return
    }

    const runningEntry = entries[0]
    if (runningEntry && !runningEntry.endedAt) {
      setCurrentEntry(runningEntry)
      currentEntryIdRef.current = runningEntry.id
    }
  }, [entries])

  useEffect(() => {
    currentEntryIdRef.current = currentEntry?.id ?? null
  }, [currentEntry?.id])

  const helpers = createOptimisticMutationHelpers(
    queryClient,
    router,
    timeEntriesQueryKey,
    timeStatsQueryKey,
  )

  const createMutation = useMutation({
    mutationFn: (startedAt: Time) => $createTimeEntry({ data: { startedAt } }),
    onMutate: async (startedAt) => {
      const context = await helpers.onMutate()

      const optimisticEntry: TimeEntry = {
        id: `temp-${Date.now()}`,
        userId: '',
        startedAt,
        endedAt: null,
        description: null,
      }

      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) =>
          old ? [optimisticEntry, ...old] : [optimisticEntry],
      )

      setCurrentEntry(optimisticEntry)
      return context
    },
    onError: (err, variables, context) => {
      helpers.onError(err, variables, context)
      setCurrentEntry(null)
    },
    onSuccess: setCurrentEntry,
    onSettled: helpers.onSettled,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; endedAt?: Time; description?: string }) =>
      $updateTimeEntry({ data }),
    onMutate: async (variables) => {
      const context = await helpers.onMutate()

      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) =>
          old?.map((entry) =>
            entry.id === variables.id
              ? {
                  ...entry,
                  endedAt: variables.endedAt ?? entry.endedAt,
                  description: variables.description ?? entry.description,
                }
              : entry,
          ),
      )

      setCurrentEntry(null)
      return context
    },
    onError: (err, variables, context) => {
      helpers.onError(err, variables, context)
      if (currentEntry) setCurrentEntry(currentEntry)
    },
    onSettled: helpers.onSettled,
  })

  return {
    start: () => createMutation.mutateAsync(Time.now()),
    end: (description: string) => {
      if (!currentEntry) return
      const trimmed = description.trim()
      return updateMutation.mutateAsync({
        id: currentEntry.id,
        endedAt: Time.now(),
        description: trimmed || undefined,
      })
    },
    currentEntry,
    isPending: createMutation.isPending || updateMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

export function TimeRecorderControls({
  entries,
  className,
}: TimeRecorderControlsProps) {
  const { start, end, currentEntry, isPending, isCreating, isUpdating } =
    useTimeTableControls(entries)
  const now = useNow()
  const currentStart = currentEntry ? Time.from(currentEntry.startedAt) : null
  const queryClient = useQueryClient()

  const [description, setDescription] = useState('')
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const entryKey = `${currentEntry?.id ?? 'none'}-${currentEntry?.description ?? ''}`

  const { data: tags = [] } = useQuery(getTimeEntryTagsQueryOptions())

  useEffect(() => {
    if (!currentEntry || !currentEntry.description) return
    setDescription(currentEntry.description)
  }, [currentEntry])

  const showCreating = useDebounce(isCreating, 300)
  const showUpdating = useDebounce(isUpdating, 300)

  const trimmedDescription = description.trim()

  const createTagMutation = useMutation({
    mutationFn: (description: string) =>
      $createTimeEntryTag({ data: { description } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryTagsQueryKey })
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => $deleteTimeEntryTag({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: timeEntryTagsQueryKey })
      const previousTags = queryClient.getQueryData<TimeEntryTag[]>(
        timeEntryTagsQueryKey,
      )
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryTagsQueryKey })
    },
  })

  const tagExists = tags.some(
    (tag) => tag.description.trim() === trimmedDescription,
  )
  const isSaveAsTagDisabled =
    trimmedDescription.length === 0 ||
    !!currentEntry ||
    tagExists ||
    createTagMutation.isPending

  async function onStart() {
    await start()
  }

  async function onEnd() {
    await end(description)
    setDescription('')
  }

  async function onSaveAsTag() {
    if (!trimmedDescription) return
    await createTagMutation.mutateAsync(trimmedDescription)
  }

  function onSelectTag(tag: TimeEntryTag) {
    setDescription(tag.description)
    setTagPopoverOpen(false)
  }

  function onDeleteTag(e: React.MouseEvent, tagId: string) {
    e.stopPropagation()
    deleteTagMutation.mutate(tagId)
  }

  return (
    <div
      className={cn(
        'container flex flex-col gap-4 rounded-md border p-4',
        className,
      )}
    >
      <div className="space-x-2">
        <span className={title({ h: 4 })}>Elapsed time:</span>
        <AnimatePresence mode="wait">
          {currentStart && now ? (
            <m.span
              key="elapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {currentStart.formatDiff(now)}
            </m.span>
          ) : (
            <m.span
              key="placeholder"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center"
            >
              {now ? (
                '00:00:00'
              ) : (
                <Skeleton className="inline-block h-4 w-16 translate-y-0.5" />
              )}
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-2">
        <Textarea
          key={entryKey}
          className="grow resize-none"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
          }}
          placeholder="Description"
          disabled={isPending}
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
      <div className="flex gap-2">
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isPending}
              aria-label="Select tag"
            >
              <TagIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Saved Tags</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setTagPopoverOpen(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              {tags.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No tags saved yet. Type a description and click "Save as tag"
                  to create one.
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => onSelectTag(tag)}
                    >
                      <span className="flex-1 truncate">{tag.description}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => onDeleteTag(e, tag.id)}
                        disabled={deleteTagMutation.isPending}
                        aria-label="Delete tag"
                      >
                        <Trash2Icon className="size-3.5 text-destructive" />
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {currentEntry ? (
          <Button onClick={onEnd} disabled={isPending} className="flex-1">
            <span className="flex items-center gap-2">
              <AnimatedSpinner show={showUpdating} />
              End
            </span>
          </Button>
        ) : (
          <Button onClick={onStart} disabled={isPending} className="flex-1">
            <span className="flex items-center gap-2">
              <AnimatedSpinner show={showCreating} />
              Start
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

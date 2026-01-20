import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { createOptimisticMutationHelpers } from '@/lib/hooks/use-optimistic-mutation'
import { cn } from '@/lib/utils/cn'
import { Time } from '@/lib/utils/time'
import type { TimeEntry, TimeEntryTag } from '@/server/db/schema/time'
import {
  $createTimeEntry,
  $updateTimeEntry,
  timeEntriesQueryKey,
  timeStatsQueryKey,
} from '@/server/functions/time-entry'
import { DescriptionInput } from './description-input'
import { ElapsedTimeDisplay } from './elapsed-time-display'
import { TimerControlButtons } from './timer-control-buttons'

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
  const currentStart = currentEntry ? Time.from(currentEntry.startedAt) : null

  const [description, setDescription] = useState('')
  const entryKey = `${currentEntry?.id ?? 'none'}-${currentEntry?.description ?? ''}`

  useEffect(() => {
    if (!currentEntry || !currentEntry.description) return
    setDescription(currentEntry.description)
  }, [currentEntry])

  const showCreating = useDebounce(isCreating, 300)
  const showUpdating = useDebounce(isUpdating, 300)

  async function onStart() {
    await start()
  }

  async function onEnd() {
    await end(description)
    setDescription('')
  }

  function onSelectTag(tag: TimeEntryTag) {
    setDescription(tag.description)
  }

  return (
    <div
      className={cn(
        'container flex flex-col gap-4 rounded-md border p-4',
        className,
      )}
    >
      <ElapsedTimeDisplay startTime={currentStart} />
      <DescriptionInput
        description={description}
        onDescriptionChange={setDescription}
        disabled={isPending}
        entryKey={entryKey}
        currentEntry={currentEntry}
      />
      <TimerControlButtons
        currentEntry={currentEntry}
        onStart={onStart}
        onEnd={onEnd}
        onSelectTag={onSelectTag}
        isPending={isPending}
        showCreating={showCreating}
        showUpdating={showUpdating}
      />
    </div>
  )
}

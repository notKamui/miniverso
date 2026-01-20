import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'
import { AnimatedSpinner } from '@/components/ui/animated-spinner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { title } from '@/components/ui/typography'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useNow } from '@/lib/hooks/use-now'
import { createOptimisticMutationHelpers } from '@/lib/hooks/use-optimistic-mutation'
import { cn } from '@/lib/utils/cn'
import { Time } from '@/lib/utils/time'
import type { TimeEntry } from '@/server/db/schema/time'
import {
  $createTimeEntry,
  $updateTimeEntry,
  timeEntriesQueryKey,
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
      const updatedEntry = entries.find((e) => e.id === currentId)
      if (updatedEntry) {
        if (updatedEntry.endedAt) {
          setCurrentEntry(null)
          currentEntryIdRef.current = null
        } else {
          setCurrentEntry(updatedEntry)
        }
      } else {
        setCurrentEntry(null)
        currentEntryIdRef.current = null
      }
    } else {
      const lastEntry = entries[0]
      if (lastEntry && !lastEntry.endedAt) {
        setCurrentEntry(lastEntry)
        currentEntryIdRef.current = lastEntry.id
      }
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

  const [description, setDescription] = useState<string>('')

  // Sync description with current entry when it's updated
  useEffect(() => {
    if (currentEntry) {
      setDescription(currentEntry.description ?? '')
    } else {
      setDescription('')
    }
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
      <Textarea
        className="grow resize-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        disabled={isPending}
      />
      {currentEntry ? (
        <Button onClick={onEnd} disabled={isPending}>
          <span className="flex items-center gap-2">
            <AnimatedSpinner show={showUpdating} />
            End
          </span>
        </Button>
      ) : (
        <Button onClick={onStart} disabled={isPending}>
          <span className="flex items-center gap-2">
            <AnimatedSpinner show={showCreating} />
            Start
          </span>
        </Button>
      )}
    </div>
  )
}

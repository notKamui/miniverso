import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

export function TimeRecorderControls({
  entries,
  className,
}: TimeRecorderControlsProps) {
  const { start, end, currentEntry, isCreating, isUpdating } =
    useTimeTableControls(entries)
  const now = useNow()
  const currentStart = currentEntry ? Time.from(currentEntry.startedAt) : null

  const [description, setDescription] = useState<string>('')

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
        {currentStart ? (
          <span>{currentStart.formatDiff(now)}</span>
        ) : (
          <span>00:00:00</span>
        )}
      </div>
      <Textarea
        className="grow resize-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        disabled={isUpdating}
      />
      {currentEntry ? (
        <Button onClick={onEnd} disabled={isUpdating}>
          <span className="flex items-center gap-2">
            <span className="inline-flex w-4 items-center justify-center">
              <AnimatePresence>
                {showUpdating && (
                  <m.span
                    key="updating-spinner"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Spinner />
                  </m.span>
                )}
              </AnimatePresence>
            </span>
            End
          </span>
        </Button>
      ) : (
        <Button onClick={onStart} disabled={isCreating}>
          <span className="flex items-center gap-2">
            <span className="inline-flex w-4 items-center justify-center">
              <AnimatePresence>
                {showCreating && (
                  <m.span
                    key="creating-spinner"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Spinner />
                  </m.span>
                )}
              </AnimatePresence>
            </span>
            Start
          </span>
        </Button>
      )}
    </div>
  )
}

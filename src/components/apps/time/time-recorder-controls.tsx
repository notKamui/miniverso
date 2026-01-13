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

  const createMutation = useMutation({
    mutationFn: (startedAt: Time) => $createTimeEntry({ data: { startedAt } }),
    onSuccess: async (entry) => {
      setCurrentEntry(entry)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: timeEntriesQueryKey }),
        queryClient.invalidateQueries({ queryKey: timeStatsQueryKey }),
        router.invalidate(),
      ])
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; endedAt?: Time; description?: string }) =>
      $updateTimeEntry({ data }),
    onSuccess: async () => {
      setCurrentEntry(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: timeEntriesQueryKey }),
        queryClient.invalidateQueries({ queryKey: timeStatsQueryKey }),
        router.invalidate(),
      ])
    },
  })

  async function start() {
    await createMutation.mutateAsync(Time.now())
  }

  async function end(description: string) {
    if (!currentEntry) return
    const trimmedDescription = description.trim()
    await updateMutation.mutateAsync({
      id: currentEntry.id,
      endedAt: Time.now(),
      description: trimmedDescription.length ? trimmedDescription : undefined,
    })
  }

  return {
    start,
    end,
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

  // Delay showing pending state to avoid flashing
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

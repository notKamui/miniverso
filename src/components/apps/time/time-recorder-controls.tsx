import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { title } from '@/components/ui/typography'
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
  const createTimeEntry = useServerFn($createTimeEntry)
  const updateTimeEntry = useServerFn($updateTimeEntry)

  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(() => {
    const lastEntry = entries[0]
    if (lastEntry?.endedAt) return null
    return lastEntry ?? null
  })

  async function invalidateTimeQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: timeEntriesQueryKey }),
      queryClient.invalidateQueries({ queryKey: timeStatsQueryKey }),
      router.invalidate(),
    ])
  }

  async function start() {
    const entry = await createTimeEntry({ data: { startedAt: Time.now() } })
    setCurrentEntry(entry)
    await invalidateTimeQueries()
  }

  async function end(description: string) {
    if (!currentEntry) return
    const trimmedDescription = description.trim()
    await updateTimeEntry({
      data: {
        id: currentEntry.id,
        endedAt: Time.now(),
        description: trimmedDescription.length ? trimmedDescription : undefined,
      },
    })
    setCurrentEntry(null)
    await invalidateTimeQueries()
  }

  return {
    start,
    end,
    currentEntry,
  }
}

export function TimeRecorderControls({
  entries,
  className,
}: TimeRecorderControlsProps) {
  const { start, end, currentEntry } = useTimeTableControls(entries)
  const now = useNow()
  const currentStart = currentEntry ? Time.from(currentEntry.startedAt) : null

  const [description, setDescription] = useState<string>('')

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
      />
      {currentEntry ? (
        <Button onClick={onEnd}>End</Button>
      ) : (
        <Button onClick={onStart}>Start</Button>
      )}
    </div>
  )
}

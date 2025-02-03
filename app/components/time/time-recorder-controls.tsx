import { Button } from '@app/components/ui/button'
import { title } from '@app/components/ui/primitives/typography'
import { Textarea } from '@app/components/ui/textarea'
import { useNow } from '@app/hooks/use-now'
import { cn } from '@app/utils/cn'
import { Time } from '@common/utils/time'
import type { TimeEntry } from '@server/db/schema'
import {
  $createTimeEntry,
  $updateTimeEntry,
} from '@server/functions/time-entry'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/start'
import { useState } from 'react'

export type TimeRecorderControlsProps = {
  entries: TimeEntry[]
  className?: string
}

function useTimeTableControls(entries: TimeRecorderControlsProps['entries']) {
  const router = useRouter()
  const createTimeEntry = useServerFn($createTimeEntry)
  const updateTimeEntry = useServerFn($updateTimeEntry)

  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(() => {
    const lastEntry = entries[0]
    if (lastEntry?.endedAt) return null
    return lastEntry ?? null
  })

  async function start() {
    const entry = await createTimeEntry({ data: { startedAt: new Date() } })
    setCurrentEntry(entry)
    router.invalidate()
  }

  async function end(description: string) {
    if (!currentEntry) return
    const trimmedDescription = description.trim()
    await updateTimeEntry({
      data: {
        id: currentEntry.id,
        endedAt: new Date(),
        description: trimmedDescription.length ? trimmedDescription : undefined,
      },
    })
    setCurrentEntry(null)
    router.invalidate()
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

import { useEffect, useState } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { cn } from '@/lib/utils/cn'
import { Time } from '@/lib/utils/time'
import type { TimeEntry, TimeEntryTag } from '@/server/db/schema/time'
import { DescriptionInput } from './description-input'
import { ElapsedTimeDisplay } from './elapsed-time-display'
import { TimerControlButtons } from './timer-control-buttons'
import { useCurrentTimeEntry } from './use-current-time-entry'
import { useTimeEntryMutations } from './use-time-entry-mutations'

export type TimeRecorderControlsProps = {
  entries: TimeEntry[]
  className?: string
}

export function TimeRecorderControls({ entries, className }: TimeRecorderControlsProps) {
  const { currentEntry, setCurrentEntry } = useCurrentTimeEntry(entries)
  const { start, end, isPending, isCreating, isUpdating } = useTimeEntryMutations({
    currentEntry,
    setCurrentEntry,
  })
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
    <div className={cn('container flex flex-col gap-4 rounded-md border p-4', className)}>
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

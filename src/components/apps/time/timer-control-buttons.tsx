import { AnimatedSpinner } from '@/components/ui/animated-spinner'
import { Button } from '@/components/ui/button'
import type { TimeEntry, TimeEntryTag } from '@/server/db/schema/time'
import { TagSelector } from './tag-selector'

type TimerControlButtonsProps = {
  currentEntry: TimeEntry | null
  onStart: () => Promise<void>
  onEnd: () => Promise<void>
  onSelectTag: (tag: TimeEntryTag) => void
  isPending: boolean
  showCreating: boolean
  showUpdating: boolean
}

export function TimerControlButtons({
  currentEntry,
  onStart,
  onEnd,
  onSelectTag,
  isPending,
  showCreating,
  showUpdating,
}: TimerControlButtonsProps) {
  return (
    <div className="flex gap-2">
      <TagSelector onSelectTag={onSelectTag} disabled={isPending} />
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
  )
}

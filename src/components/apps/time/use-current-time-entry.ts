import { useEffect, useRef, useState } from 'react'
import type { TimeEntry } from '@/server/db/schema/time'

export function useCurrentTimeEntry(entries: TimeEntry[]) {
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

  return { currentEntry, setCurrentEntry }
}

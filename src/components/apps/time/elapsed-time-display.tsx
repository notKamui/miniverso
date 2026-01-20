import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Skeleton } from '@/components/ui/skeleton'
import { title } from '@/components/ui/typography'
import { useNow } from '@/lib/hooks/use-now'
import type { Time } from '@/lib/utils/time'

type ElapsedTimeDisplayProps = {
  startTime: Time | null
}

export function ElapsedTimeDisplay({ startTime }: ElapsedTimeDisplayProps) {
  const now = useNow()

  return (
    <div className="space-x-2">
      <span className={title({ h: 4 })}>Elapsed time:</span>
      <AnimatePresence mode="wait">
        {startTime && now ? (
          <m.span
            key="elapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {startTime.formatDiff(now)}
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
  )
}

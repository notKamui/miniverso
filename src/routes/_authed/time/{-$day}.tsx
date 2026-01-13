import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import {
  $deleteTimeEntries,
  $getTimeEntriesByDay,
} from '@/server/functions/time-entry'

export const Route = createFileRoute('/_authed/time/{-$day}')({
  validateSearch: z.object({
    tz: z.coerce.number().int().min(-840).max(840).optional(),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params: { day }, deps: { search } }) => {
    const date = Time.from(day)
    const tzOffsetMinutes = search.tz ?? 0

    let entries = await $getTimeEntriesByDay({
      data: {
        dayKey: date.formatDayKey(),
        tzOffsetMinutes,
      },
    })

    if (!date.isToday()) {
      const [ended, notEnded] = Collection.partition(
        entries,
        (e) => e.endedAt !== null,
      )
      entries = ended
      await $deleteTimeEntries({ data: { ids: notEnded.map((e) => e.id) } })
    }

    entries.sort((a, b) => b.startedAt.compare(a.startedAt))

    return {
      entries,
      time: date,
      crumb: date.isToday() ? undefined : date.formatDayNumber(),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { entries, time } = Route.useLoaderData({
    select: ({ entries, time }) => ({ entries, time }),
  })

  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay time={time} entries={entries} />
    </div>
  )
}

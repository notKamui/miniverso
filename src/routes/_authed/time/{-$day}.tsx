import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { Time } from '@/lib/utils/time'
import { $deleteTimeEntries, getTimeEntriesByDayQueryOptions } from '@/server/functions/time-entry'

export const Route = createFileRoute('/_authed/time/{-$day}')({
  validateSearch: z.object({
    tz: z.coerce.number().int().min(-840).max(840).optional(),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params: { day }, deps: { search }, context: { queryClient } }) => {
    const date = Time.from(day)
    const tzOffsetMinutes = search.tz ?? 0

    const entries = await queryClient.fetchQuery(
      getTimeEntriesByDayQueryOptions({
        dayKey: date.formatDayKey(),
        tzOffsetMinutes,
      }),
    )

    if (!date.isToday()) {
      const notEnded = entries.filter((e) => !e.endedAt)
      if (notEnded.length > 0) {
        await $deleteTimeEntries({ data: { ids: notEnded.map((e) => e.id) } })
      }
    }

    return {
      time: date,
      crumb: date.isToday() ? undefined : date.formatDayNumber(),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { time } = Route.useLoaderData({
    select: ({ time }) => ({ time }),
  })
  const { tz = 0 } = Route.useSearch()

  const { data: entries } = useSuspenseQuery(
    getTimeEntriesByDayQueryOptions({
      dayKey: time.formatDayKey(),
      tzOffsetMinutes: tz,
    }),
  )

  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay time={time} entries={entries} tzOffset={tz} />
    </div>
  )
}

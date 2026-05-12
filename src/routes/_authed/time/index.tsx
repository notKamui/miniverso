import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { Time } from '@/lib/utils/time'
import { getColumnVisibilityQueryOptions } from '@/server/functions/column-visibility'
import { getTimeEntriesByDayQueryOptions } from '@/server/functions/time-entry'

export const Route = createFileRoute('/_authed/time/')({
  validateSearch: z.object({
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    tz: z.coerce.number().int().min(-840).max(840).optional(),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const date = Time.from(search.day)
    const tzOffsetMinutes = search.tz ?? 0

    const [columnVisibilityTimeRecorder] = await Promise.all([
      queryClient.fetchQuery(getColumnVisibilityQueryOptions('time-recorder')),
      queryClient.ensureQueryData(
        getTimeEntriesByDayQueryOptions({
          dayKey: date.formatDayKey(),
          tzOffsetMinutes,
        }),
      ),
    ])

    return {
      columnVisibilityTimeRecorder,
      time: date,
      crumb: date.isToday() ? undefined : date.formatDayNumber(),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { time, columnVisibilityTimeRecorder } = Route.useLoaderData({
    select: ({ time, columnVisibilityTimeRecorder }) => ({ time, columnVisibilityTimeRecorder }),
  })
  const tz = Route.useSearch({
    select: ({ tz }) => tz ?? 0,
  })

  const { data: entries } = useSuspenseQuery(
    getTimeEntriesByDayQueryOptions({
      dayKey: time.formatDayKey(),
      tzOffsetMinutes: tz,
    }),
  )

  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay
        time={time}
        entries={entries}
        tzOffset={tz}
        columnVisibilityTimeRecorder={columnVisibilityTimeRecorder}
      />
    </div>
  )
}

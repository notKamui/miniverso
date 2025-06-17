import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import {
  $deleteTimeEntries,
  $getTimeEntriesByDay,
} from '@/server/functions/time-entry'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/time/$day')({
  loader: async ({ params: { day } }) => {
    const time = Time.from(day)
    if (time.isToday()) throw redirect({ to: '/time' })

    const [entries, notEnded] = Collection.partition(
      await $getTimeEntriesByDay({
        data: { date: time.getDate() },
      }),
      (entry) => entry.endedAt !== null,
    )

    entries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    await $deleteTimeEntries({ data: { ids: notEnded.map((e) => e.id) } })

    return {
      entries,
      date: time.getDate(),
      crumbs: crumbs(
        { title: 'Time recorder', to: '/time' },
        { title: time.formatDay({ short: true }) },
      ),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { entries, date } = Route.useLoaderData()
  const time = Time.from(date)

  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay time={time} entries={entries} />
    </div>
  )
}

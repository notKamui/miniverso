import { RecorderDisplay } from '@app/components/time/time-recorder-display'
import { title } from '@app/components/ui/primitives/typography'
import { crumbs } from '@app/hooks/use-crumbs'
import { Collection } from '@common/utils/collection'
import { Time } from '@common/utils/time'
import {
  $deleteTimeEntry,
  $getTimeEntriesByDay,
  $getTimeStatsBy,
} from '@server/functions/time-entry'
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
    await Promise.all(
      notEnded.map((entry) => $deleteTimeEntry({ data: { id: entry.id } })),
    )

    return {
      entries,
      date: time.getDate(),
      crumbs: crumbs({ title: 'Time recorder', to: '/time' }, { title: time.formatDay({ short: true }) }),
      a: await $getTimeStatsBy({ data: { date: time.getDate(), type: 'week' } }),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { entries, date, a } = Route.useLoaderData()
  const time = Time.from(date)
  console.log('AAA', a);


  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay time={time} entries={entries} />
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import {
  $deleteTimeEntries,
  $getTimeEntriesByDay,
} from '@/server/functions/time-entry'

export const Route = createFileRoute('/_authed/time/{-$day}')({
  loader: async ({ params: { day } }) => {
    const time = Time.from(day)

    let entries = await $getTimeEntriesByDay({
      data: { date: time.getDate() },
    })

    if (!time.isToday()) {
      const [ended, notEnded] = Collection.partition(
        entries,
        (e) => e.endedAt !== null,
      )
      entries = ended
      await $deleteTimeEntries({ data: { ids: notEnded.map((e) => e.id) } })
    }

    entries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

    const breadcrumbs = time.isToday()
      ? crumbs({ title: 'Time recorder' })
      : crumbs(
          {
            title: 'Time recorder',
            link: { to: '/time/{-$day}', params: { day: undefined } },
          },
          { title: time.formatDayNumber() },
        )

    return {
      entries,
      time,
      crumbs: breadcrumbs,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { entries, time } = Route.useLoaderData({ structuralSharing: true })

  return (
    <div className="space-y-8">
      <h2 className={title({ h: 2 })}>Time recorder</h2>
      <RecorderDisplay time={time} entries={entries} />
    </div>
  )
}

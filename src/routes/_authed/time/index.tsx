import { createFileRoute } from '@tanstack/react-router'
import { RecorderDisplay } from '@/components/apps/time/time-recorder-display'
import { title } from '@/components/ui/typography'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { Time } from '@/lib/utils/time'
import { $getTimeEntriesByDay } from '@/server/functions/time-entry'

export const Route = createFileRoute('/_authed/time/')({
  loader: async () => {
    const time = Time.now()
    const entries = await $getTimeEntriesByDay({
      data: { date: time.getDate() },
    })
    entries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

    return {
      entries,
      date: time.getDate(),
      crumbs: crumbs({ title: 'Time recorder' }),
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

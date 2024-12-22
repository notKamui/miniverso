import { crumbs } from '@app/hooks/use-crumbs'
import { Time } from '@common/utils/time'
import { $getTimeStatsBy } from '@server/functions/time-entry'
import { createFileRoute } from '@tanstack/react-router'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const DAYS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
} as const

export const Route = createFileRoute('/_authed/time/stats')({
  loader: async () => {
    const time = Time.now()

    const stats = await $getTimeStatsBy({
      data: { date: time.getDate(), type: 'week' },
    })

    return {
      stats,
      crumbs: crumbs(
        { title: 'Time recorder', to: '/time' },
        { title: 'Statistics' },
      ),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { stats } = Route.useLoaderData()

  const fullRange = Object.keys(DAYS).map(Number)
  const data = fullRange.map((dayOrMonth) => {
    const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
    return {
      day: DAYS[dayOrMonth],
      total: entry ? entry.total : 0,
    }
  })

  return (
    <div className="size-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis
            dataKey="total"
            tickFormatter={(total) => Time.formatTime(total * 1000)}
          />
          <Tooltip
            formatter={(total: number) => Time.formatTime(total * 1000)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

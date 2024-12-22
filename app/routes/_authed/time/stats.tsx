import { crumbs } from '@app/hooks/use-crumbs'
import { Collection } from '@common/utils/collection'
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
import { z } from 'zod'

type Stats = {
  unit: 'day' | 'month'
  total: number
  dayOrMonth: number
}[]

const DAYS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
} as const

const MONTHS = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
} as const

const CHARTS = {
  week: (stats: Stats) => {
    const fullRange = Object.keys(DAYS).map(Number)
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      return {
        day: DAYS[dayOrMonth],
        total: entry ? entry.total : 0,
      }
    })
    return {
      data,
      x: 'day',
      y: 'total',
      format: (total: number) => Time.formatTime(total * 1000),
    }
  },
  month: (stats: Stats) => {
    const fullRange = Collection.range(1, 32)
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      return {
        day: dayOrMonth,
        total: entry ? entry.total : 0,
      }
    })
    return {
      data,
      x: 'day',
      y: 'total',
      format: (total: number) => Time.formatTime(total * 1000),
    }
  },
  year: (stats: Stats) => {
    const fullRange = Object.keys(MONTHS).map(Number)
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      return {
        month: MONTHS[dayOrMonth],
        total: entry ? entry.total : 0,
      }
    })
    return {
      data,
      x: 'month',
      y: 'total',
      format: (total: number) => Time.formatTime(total * 1000),
    }
  },
} as const

export const Route = createFileRoute('/_authed/time/stats')({
  validateSearch: z.object({
    date: z.date().optional(),
    type: z.enum(['week', 'month', 'year']).optional().default('week'),
  }),
  loaderDeps: ({ search }) => {
    return { search }
  },
  loader: async ({
    deps: {
      search: { date, type },
    },
  }) => {
    const time = date ? Time.from(date) : Time.now()

    const stats = await $getTimeStatsBy({
      data: { date: time.getDate(), type },
    })

    return {
      stats,
      date,
      type,
      crumbs: crumbs(
        { title: 'Time recorder', to: '/time' },
        { title: 'Statistics' },
      ),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { stats, date, type } = Route.useLoaderData()

  const chart = CHARTS[type](stats)

  return (
    <div className="size-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          width={500}
          height={300}
          data={chart.data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chart.x} />
          <YAxis dataKey={chart.y} tickFormatter={chart.format} />
          <Tooltip formatter={chart.format} />
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

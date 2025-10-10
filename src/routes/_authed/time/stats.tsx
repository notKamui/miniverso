import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { z } from 'zod'
import { CalendarSelect } from '@/components/ui/calendar-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import { $getTimeStatsBy } from '@/server/functions/time-entry'

type Stats = {
  unit: 'day' | 'month'
  total: number
  dayOrMonth: number
}[]

type Chart = (
  stats: Stats,
  time: Time,
) => {
  data: any[]
  x: string
  y: string
  format: (value: any) => string
}

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
  week: (stats) => {
    const fullRange = Object.keys(DAYS).map(Number)
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      return {
        day: DAYS[dayOrMonth as keyof typeof DAYS],
        total: entry ? entry.total : 0,
      }
    })
    return {
      data,
      x: 'day',
      y: 'total',
      format: (total: number) => Time.formatDuration(total * 1000),
    }
  },
  month: (stats, time) => {
    const daysInMonth = [1, 3, 5, 7, 8, 10, 12].includes(time.getMonth())
      ? 31
      : 30
    const fullRange = Collection.range(1, daysInMonth + 1)
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
      format: (total: number) => Time.formatDuration(total * 1000),
    }
  },
  year: (stats) => {
    const fullRange = Object.keys(MONTHS).map(Number)
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      return {
        month: MONTHS[dayOrMonth as keyof typeof MONTHS],
        total: entry ? entry.total : 0,
      }
    })
    return {
      data,
      x: 'month',
      y: 'total',
      format: (total: number) => Time.formatDuration(total * 1000),
    }
  },
} satisfies Record<string, Chart>

export const Route = createFileRoute('/_authed/time/stats')({
  validateSearch: z.object({
    date: z.coerce.date().optional(),
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
      time,
      type,
      crumbs: crumbs(
        {
          title: 'Time recorder',
          link: { to: '/time/{-$day}', params: { day: undefined } },
        },
        { title: 'Statistics' },
      ),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  //const { theme } = useTheme()
  const { stats, time, type } = Route.useLoaderData()

  const chart = CHARTS[type](stats, time)

  return (
    <div className="flex size-full flex-col gap-4">
      <div className="flex flex-row gap-4 max-lg:flex-col">
        <CalendarSelect
          value={time.getDate()}
          onChange={(date) => navigate({ to: '.', search: { date, type } })}
          className="max-lg:w-full"
        />
        <Select
          value={type}
          onValueChange={(type: 'week' | 'month' | 'year') =>
            navigate({ to: '.', search: { date: time.getDate(), type } })
          }
        >
          <SelectTrigger className="w-[180px] max-lg:w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer>
        <LineChart
          data={chart.data}
          margin={{
            top: 5,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chart.x} />
          <YAxis dataKey={chart.y} tickFormatter={chart.format} />
          <Tooltip
            formatter={chart.format}
            wrapperClassName="AAAA"
            contentStyle={{
              borderRadius: 'var(--radius)',
              // ...(theme === 'light'
              //   ? {}
              //   : { backgroundColor: 'hsl(var(--background))' }),
            }}
            itemStyle={
              {
                // color: theme === 'light' ? '#8884d8' : '#b3b0e9',
              }
            }
          />
          <Line
            type="monotone"
            dataKey="total"
            // stroke={theme === 'light' ? '#8884d8' : '#b3b0e9'}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

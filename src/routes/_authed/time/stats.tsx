import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import * as z from 'zod'
import { CalendarSelect } from '@/components/ui/calendar-select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import { getTimeStatsQueryOptions } from '@/server/functions/time-entry'

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
  getDayKey: (dataItem: { dayKey: string }) => string | null
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

const CHARTS: Record<string, Chart> = {
  week: (stats, time) => {
    const fullRange = Object.keys(DAYS).map(Number)
    const [y, m, d] = [
      time.getDate().getFullYear(),
      time.getDate().getMonth(),
      time.getDate().getDate(),
    ]
    const baseDate = new Date(y, m, d)
    const weekday = baseDate.getDay() // 0..6 (Sun..Sat)
    const diffToMonday = weekday === 0 ? -6 : 1 - weekday
    const mondayDate = new Date(y, m, d + diffToMonday)

    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      const dayDate = new Date(mondayDate)
      dayDate.setDate(mondayDate.getDate() + (dayOrMonth - 1))
      return {
        day: DAYS[dayOrMonth as keyof typeof DAYS],
        dayOrMonth,
        total: entry ? entry.total : 0,
        dayKey: Time.from(dayDate).formatDayKey(),
      }
    })
    return {
      data,
      x: 'day',
      y: 'total',
      format: (total: number) => Time.formatDuration(total * 1000),
      getDayKey: (item) => item.dayKey,
    }
  },
  month: (stats, time) => {
    const daysInMonth = [1, 3, 5, 7, 8, 10, 12].includes(time.getMonth())
      ? 31
      : 30
    const fullRange = Collection.range(1, daysInMonth + 1)
    const [y, m] = [time.getDate().getFullYear(), time.getDate().getMonth()]
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      const dayDate = new Date(y, m, dayOrMonth)
      return {
        day: dayOrMonth,
        dayOrMonth,
        total: entry ? entry.total : 0,
        dayKey: Time.from(dayDate).formatDayKey(),
      }
    })
    return {
      data,
      x: 'day',
      y: 'total',
      format: (total: number) => Time.formatDuration(total * 1000),
      getDayKey: (item) => item.dayKey,
    }
  },
  year: (stats, time) => {
    const fullRange = Object.keys(MONTHS).map(Number)
    const y = time.getDate().getFullYear()
    const data = fullRange.map((dayOrMonth) => {
      const entry = stats.find((stat) => stat.dayOrMonth === dayOrMonth)
      // Navigate to the first day of the month
      const dayDate = new Date(y, dayOrMonth - 1, 1)
      return {
        month: MONTHS[dayOrMonth as keyof typeof MONTHS],
        dayOrMonth,
        total: entry ? entry.total : 0,
        dayKey: Time.from(dayDate).formatDayKey(),
      }
    })
    return {
      data,
      x: 'month',
      y: 'total',
      format: (total: number) => Time.formatDuration(total * 1000),
      getDayKey: (item) => item.dayKey,
    }
  },
}

export const Route = createFileRoute('/_authed/time/stats')({
  validateSearch: z.object({
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    type: z.enum(['week', 'month', 'year']).optional().default('week'),
    tz: z.coerce.number().int().min(-840).max(840).optional(),
  }),
  loaderDeps: ({ search }) => {
    return { search }
  },
  loader: async ({
    deps: {
      search: { day, type, tz },
    },
    context: { queryClient },
  }) => {
    const tzOffsetMinutes = tz ?? Time.getOffset()

    const dayKey = day ?? Time.now().formatDayKey()

    const stats = await queryClient.fetchQuery(
      getTimeStatsQueryOptions({
        dayKey,
        type,
        tzOffsetMinutes,
      }),
    )

    return {
      stats,
      dayKey,
      type,
      crumb: 'Statistics',
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { stats, dayKey, type } = Route.useLoaderData({
    select: ({ stats, dayKey, type }) => ({ stats, dayKey, type }),
  })
  const { tz = Time.getOffset() } = Route.useSearch()

  const [y, m, d] = dayKey.split('-').map(Number)
  const time = Time.from(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1))

  const chart = CHARTS[type](stats, time)

  const chartConfig = {
    total: {
      label: 'Total',
      color: 'var(--chart-1)',
    },
  } as const

  const totalSeconds = stats.reduce((sum, stat) => sum + stat.total, 0)
  const totalFormatted = Time.formatDuration(totalSeconds * 1000)

  return (
    <div className="flex size-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-row items-center gap-4 max-lg:flex-col">
        <CalendarSelect
          value={time.getDate()}
          onChange={(date) =>
            navigate({
              to: '.',
              search: { day: Time.from(date).formatDayKey(), type, tz },
            })
          }
          className="max-lg:w-full"
        />
        <Select
          value={type}
          onValueChange={(type: 'week' | 'month' | 'year') =>
            navigate({
              to: '.',
              search: { day: time.formatDayKey(), type, tz },
            })
          }
        >
          <SelectTrigger className="w-44 max-lg:w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-muted-foreground text-sm max-lg:ml-0 max-lg:w-full">
          Total: <span className="font-medium">{totalFormatted}</span>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
        <BarChart accessibilityLayer data={chart.data} margin={{ left: 20 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={chart.x}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickFormatter={chart.format} />
          <ChartTooltip
            cursor={false}
            content={(props) => (
              <ChartTooltipContent
                {...props}
                nameKey="total"
                formatter={(value) => chart.format(Number(value ?? 0))}
              />
            )}
          />
          <Bar
            dataKey="total"
            fill="var(--color-total)"
            radius={4}
            onClick={(data) => {
              const dayKey = chart.getDayKey(data)
              if (dayKey) {
                navigate({
                  to: '/time/{-$day}',
                  params: { day: dayKey },
                  search: { tz },
                })
              }
            }}
            style={{ cursor: 'pointer' }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

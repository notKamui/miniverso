import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DateRangeSelect } from '@/components/ui/date-range-select'
import { title } from '@/components/ui/typography'
import { getRange } from '@/lib/utils/date-range'
import { getInventoryStatsQueryOptions } from '@/server/functions/inventory'

const searchSchema = z.object({
  preset: z.enum(['today', 'week', 'month', 'year', 'lastYear']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const Route = createFileRoute('/_authed/inventory/stats')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const { start, end } =
      search.startDate && search.endDate
        ? { start: new Date(search.startDate), end: new Date(search.endDate) }
        : getRange(search.preset)
    const stats = await queryClient.fetchQuery(
      getInventoryStatsQueryOptions({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    )
    return { stats, preset: search.preset, crumb: 'Statistics' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { stats, preset } = Route.useLoaderData({
    select: ({ stats, preset }) => ({ stats, preset }),
  })

  const effective =
    search.startDate && search.endDate
      ? { startDate: search.startDate, endDate: search.endDate }
      : (() => {
          const r = getRange(preset)
          return { startDate: r.start.toISOString(), endDate: r.end.toISOString() }
        })()

  const chartData = stats.topByRevenue.slice(0, 8).map((t) => ({
    name: t.productName ?? 'Deleted',
    revenue: t.revenue,
  }))

  const chartConfig = { revenue: { label: 'Revenue', color: 'var(--chart-1)' } } as const

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={title({ h: 2 })}>Statistics</h2>
        <DateRangeSelect
          startDate={effective.startDate}
          endDate={effective.endDate}
          onChange={({ startDate, endDate }) =>
            navigate({ to: '.', search: { ...search, startDate, endDate } })
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales (incl. tax)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSalesTaxIncluded.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales (ex. tax)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSalesTaxFree.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Benefit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalBenefit.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} margin={{ left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickFormatter={(v) => `${Number(v).toFixed(0)} €`} />
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent {...props} formatter={(v) => `${Number(v).toFixed(2)} €`} />
              )}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topByRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in this range.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.topByRevenue.slice(0, 5).map((t) => (
                  <li key={t.productId} className="flex justify-between">
                    <span className="truncate">{t.productName ?? '—'}</span>
                    <span>{t.revenue.toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top by benefit</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topByBenefit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in this range.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.topByBenefit.slice(0, 5).map((t) => (
                  <li key={t.productId} className="flex justify-between">
                    <span className="truncate">{t.productName ?? '—'}</span>
                    <span>{t.benefit.toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { SalesStatsSection } from '@/components/apps/inventory/stats/sales-stats-section'
import { StockStatsSection } from '@/components/apps/inventory/stats/stock-stats-section'
import { TopProductsSection } from '@/components/apps/inventory/stats/top-products-section'
import { DateRangeSelect } from '@/components/ui/date-range-select'
import { title } from '@/components/ui/typography'
import { getRange } from '@/lib/utils/date-range'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'
import { getInventoryStatsQueryOptions } from '@/server/functions/inventory/stats-sales'
import { getInventoryStockStatsQueryOptions } from '@/server/functions/inventory/stats-stock'

const searchSchema = z.object({
  preset: z.enum(['today', 'week', 'month', 'year', 'lastYear']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  labelIds: z.array(z.uuid()).optional(),
})

export const Route = createFileRoute('/_authed/inventory/stats')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const { start, end } =
      search.startDate && search.endDate
        ? { start: new Date(search.startDate), end: new Date(search.endDate) }
        : getRange(search.preset)

    const [stats, stockStats, productionCostLabels] = await Promise.all([
      queryClient.fetchQuery(
        getInventoryStatsQueryOptions({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      ),
      queryClient.fetchQuery(getInventoryStockStatsQueryOptions({ labelIds: search.labelIds })),
      queryClient.fetchQuery(getProductionCostLabelsQueryOptions()),
    ])

    return { stats, stockStats, productionCostLabels, preset: search.preset, crumb: 'Statistics' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { stats, stockStats, productionCostLabels, preset } = Route.useLoaderData({
    select: (d) => ({
      stats: d.stats,
      stockStats: d.stockStats,
      productionCostLabels: d.productionCostLabels,
      preset: d.preset,
    }),
  })

  const effective =
    search.startDate && search.endDate
      ? { startDate: search.startDate, endDate: search.endDate }
      : (() => {
          const r = getRange(preset)
          return { startDate: r.start.toISOString(), endDate: r.end.toISOString() }
        })()

  const labels = productionCostLabels.map((l) => ({ id: l.id, name: l.name, color: l.color }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col flex-wrap justify-between gap-4 md:flex-row md:items-center">
        <h2 className={title({ h: 2 })}>Statistics</h2>
        <DateRangeSelect
          startDate={effective.startDate}
          endDate={effective.endDate}
          onChange={({ startDate, endDate }) =>
            navigate({
              to: '.',
              search: { ...search, startDate, endDate },
              replace: true,
            })
          }
        />
      </div>

      <StockStatsSection
        stockStats={stockStats}
        labels={labels}
        search={search}
        navigate={navigate}
      />
      <SalesStatsSection stats={stats} />
      <TopProductsSection
        topByRevenue={stats.topByRevenue}
        topByBenefit={stats.topByBenefit}
        topByQuantitySold={stats.topByQuantitySold}
      />
    </div>
  )
}

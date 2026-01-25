import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { SettingsSection } from '@/components/apps/inventory/settings/settings-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

type SalesStats = {
  totalSalesTaxFree: number
  totalSalesTaxIncluded: number
  totalBenefit: number
  topByRevenue: { productId: string; productName: string | null; revenue: number }[]
}

type SalesStatsSectionProps = {
  stats: SalesStats
}

export function SalesStatsSection({ stats }: SalesStatsSectionProps) {
  const chartData = stats.topByRevenue.slice(0, 8).map((t) => ({
    name: t.productName ?? 'Deleted',
    revenue: t.revenue,
  }))
  const chartConfig = { revenue: { label: 'Revenue', color: 'var(--chart-1)' } } as const

  return (
    <SettingsSection
      title="Sales (date range)"
      description="Revenue and benefit in the selected period."
    >
      <div className="space-y-4">
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
      </div>
    </SettingsSection>
  )
}

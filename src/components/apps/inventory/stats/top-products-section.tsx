import { SettingsSection } from '@/components/apps/inventory/settings/settings-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TopByRevenue = { productId: string; productName: string | null; revenue: number }
type TopByBenefit = { productId: string; productName: string | null; benefit: number }
type TopByQuantity = { productId: string; productName: string | null; quantity: number }

type TopProductsSectionProps = {
  topByRevenue: TopByRevenue[]
  topByBenefit: TopByBenefit[]
  topByQuantitySold: TopByQuantity[]
}

function TopList<T extends { productId: string; productName: string | null }>({
  items,
  valueToString,
  emptyMessage = 'No data in this range.',
}: {
  items: T[]
  valueToString: (t: T) => string
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.slice(0, 5).map((t) => (
        <li key={t.productId} className="flex justify-between">
          <span className="truncate">{t.productName ?? '—'}</span>
          <span>{valueToString(t)}</span>
        </li>
      ))}
    </ul>
  )
}

export function TopProductsSection({
  topByRevenue,
  topByBenefit,
  topByQuantitySold,
}: TopProductsSectionProps) {
  return (
    <SettingsSection
      title="Top products (date range)"
      description="By revenue, benefit, and quantity sold in the selected period."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList items={topByRevenue} valueToString={(t) => `${t.revenue.toFixed(2)} €`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top by benefit</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList items={topByBenefit} valueToString={(t) => `${t.benefit.toFixed(2)} €`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top by quantity sold</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList items={topByQuantitySold} valueToString={(t) => String(t.quantity)} />
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  )
}

import { Package } from 'lucide-react'
import { SettingsSection } from '@/components/apps/inventory/settings/settings-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const LOW_STOCK_THRESHOLD = 5

type ProductStatsSectionProps = {
  total: number
  lowStock: number
}

export function ProductStatsSection({ total, lowStock }: ProductStatsSectionProps) {
  return (
    <SettingsSection title="Summary" description="Product count and low-stock overview.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low stock (&lt; {LOW_STOCK_THRESHOLD})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-destructive' : ''}`}>
              {lowStock}
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  )
}

import { Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Section } from './section'

const LOW_STOCK_THRESHOLD = 5

type ProductStatsSectionProps = {
  total: number
  lowStock: number
}

export function ProductStatsSection({ total, lowStock }: ProductStatsSectionProps) {
  return (
    <Section
      title="Summary"
      description="Product count and low-stock overview."
      collapsible={false}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card size="sm">
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
    </Section>
  )
}

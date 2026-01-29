import { useSuspenseQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createCombobox } from '@/components/ui/combobox'
import { contrastTextForHex } from '@/lib/utils/color'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import { Section } from '../section'

type ProductionCostLabel = { id: string; name: string; color: string }
const LabelCombobox = createCombobox<ProductionCostLabel, true>()

type StockStats = {
  totalWorthExTax: number
  totalWorthIncTax: number
  totalProdCost: number
  potentialBenefit: number
}

type StockStatsSectionProps = {
  stockStats: StockStats
  labels: ProductionCostLabel[]
  search: Record<string, unknown>
  navigate: (opts: { to: string; search: Record<string, unknown> }) => void
}

export function StockStatsSection({
  stockStats,
  labels,
  search,
  navigate,
}: StockStatsSectionProps) {
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  const labelIds = (search.labelIds as string[] | undefined) ?? []
  const anchorRef = LabelCombobox.useAnchor()

  return (
    <Section
      title="Stock value"
      description="Total worth of products in stock (ex. tax, incl. tax), production cost, and potential benefit. Filter prod. cost by labels below."
    >
      <div className="space-y-4">
        {labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Prod. cost labels:</span>
            <LabelCombobox.Root
              multiple
              items={labels}
              value={labels.filter((l) => labelIds.includes(l.id))}
              onValueChange={(v) =>
                navigate({
                  to: '.',
                  search: { ...search, labelIds: v.length > 0 ? v.map((l) => l.id) : undefined },
                })
              }
              itemToStringLabel={(l) => l.name}
            >
              <LabelCombobox.Chips ref={anchorRef} className="max-w-64 min-w-32">
                {labels
                  .filter((l) => labelIds.includes(l.id))
                  .map((l) => (
                    <LabelCombobox.Chip
                      key={l.id}
                      style={
                        l.color
                          ? { backgroundColor: l.color, color: contrastTextForHex(l.color) }
                          : undefined
                      }
                    >
                      {l.name}
                    </LabelCombobox.Chip>
                  ))}
                <LabelCombobox.ChipsInput placeholder="All labels" name="labelIds" />
              </LabelCombobox.Chips>
              <LabelCombobox.Content anchor={anchorRef}>
                <LabelCombobox.List>
                  {(l) => (
                    <LabelCombobox.Item key={l.id} value={l}>
                      {l.name}
                    </LabelCombobox.Item>
                  )}
                </LabelCombobox.List>
                <LabelCombobox.Empty>No labels.</LabelCombobox.Empty>
              </LabelCombobox.Content>
            </LabelCombobox.Root>
            {labelIds.length === 0 && (
              <span className="text-xs text-muted-foreground">(all labels)</span>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Worth (ex. tax)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatMoney(stockStats.totalWorthExTax, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Worth (incl. tax)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatMoney(stockStats.totalWorthIncTax, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Prod. cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatMoney(stockStats.totalProdCost, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Potential benefit</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${stockStats.potentialBenefit < 0 ? 'text-destructive' : ''}`}
              >
                {formatMoney(stockStats.potentialBenefit, currency)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  )
}

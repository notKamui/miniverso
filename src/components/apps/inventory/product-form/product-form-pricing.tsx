import { useSuspenseQuery } from '@tanstack/react-query'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { FormInput } from '@/components/form/form-input'
import { Label } from '@/components/ui/label'
import { formatMoney, getCurrencySymbol } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'

type Props = { form: ReactForm<ProductFormValues> }

export function ProductFormPricing({ form }: Props) {
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormInput
        form={form}
        name="priceTaxFree"
        label={`Price (ex. tax) ${getCurrencySymbol(currency)}`}
        type="number"
        step="0.01"
        min={0}
        required
      />
      <FormInput
        form={form}
        name="vatPercent"
        label="VAT %"
        type="number"
        step="0.01"
        min={0}
        max={100}
        required
      />
      <form.Subscribe selector={(s) => [s.values.priceTaxFree, s.values.vatPercent]}>
        {([ptf, vat]) => {
          const priceExcl = Number.parseFloat(String(ptf ?? '')) || 0
          const vatNum = Number.parseFloat(String(vat ?? '')) || 0
          const priceIncl = priceTaxIncluded(priceExcl, vatNum)
          return (
            <div className="space-y-2">
              <Label>{`Price (incl. tax) ${getCurrencySymbol(currency)}`}</Label>
              <p className="flex h-9 items-center text-muted-foreground">
                {formatMoney(priceIncl, currency)}
              </p>
            </div>
          )
        }}
      </form.Subscribe>
    </div>
  )
}

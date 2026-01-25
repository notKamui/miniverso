import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Section } from '@/components/apps/inventory/section'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  getInventoryCurrencyQueryOptions,
  inventoryCurrencyQueryKey,
  $setInventoryCurrency,
} from '@/server/functions/inventory/currency'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const

export function CurrencySection() {
  const queryClient = useQueryClient()
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())

  const setMut = useMutation({
    mutationFn: $setInventoryCurrency,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryCurrencyQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const effectiveCurrency = CURRENCIES.includes(currency as (typeof CURRENCIES)[number])
    ? currency
    : 'EUR'

  return (
    <Section
      title="Currency"
      description="Default currency for amounts in inventory (products, orders, cash, statistics)."
    >
      <Select
        value={effectiveCurrency}
        onValueChange={(v) => setMut.mutate({ data: { currency: v } })}
        disabled={setMut.isPending}
      >
        <SelectTrigger className="w-32">{effectiveCurrency}</SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>
  )
}

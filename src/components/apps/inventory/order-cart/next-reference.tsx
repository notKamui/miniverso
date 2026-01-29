import { useQuery } from '@tanstack/react-query'
import { $getNextOrderReference } from '@/server/functions/inventory/order-reference-prefixes'

export function NextReference({ prefixId }: { prefixId: string }) {
  const { data } = useQuery({
    queryKey: ['next-order-ref', prefixId],
    queryFn: () => $getNextOrderReference({ data: { prefixId } }),
  })
  return data ? <p className="text-xs text-muted-foreground">Next reference: {data}</p> : null
}

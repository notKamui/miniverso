import { createFileRoute } from '@tanstack/react-router'
import { OrderCart } from '@/components/apps/inventory/order-cart'
import { title } from '@/components/ui/typography'
import { getOrderReferencePrefixesQueryOptions } from '@/server/functions/inventory/order-reference-prefixes'

export const Route = createFileRoute('/_authed/inventory/orders/new')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(getOrderReferencePrefixesQueryOptions())
    return { crumb: 'New order' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>New order</h2>
      <OrderCart />
    </div>
  )
}

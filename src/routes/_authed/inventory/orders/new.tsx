import { createFileRoute } from '@tanstack/react-router'
import { OrderCart } from '@/components/apps/inventory/order-cart'
import { title } from '@/components/ui/typography'

export const Route = createFileRoute('/_authed/inventory/orders/new')({
  loader: () => ({ crumb: 'New order' }),
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

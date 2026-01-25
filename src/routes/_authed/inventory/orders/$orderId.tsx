import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { OrderDetail } from '@/components/apps/inventory/order-detail'
import { title } from '@/components/ui/typography'
import { getOrderQueryOptions } from '@/server/functions/inventory/orders'

export const Route = createFileRoute('/_authed/inventory/orders/$orderId')({
  loader: async ({ context: { queryClient }, params: { orderId } }) => {
    const data = await queryClient.ensureQueryData(getOrderQueryOptions(orderId))
    return { crumb: data.order.reference }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { orderId } = Route.useParams()
  const { data } = useSuspenseQuery(getOrderQueryOptions(orderId))
  return (
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>{data.order.reference}</h2>
      <OrderDetail orderId={orderId} />
    </div>
  )
}

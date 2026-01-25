import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'

export const Route = createFileRoute('/_authed/inventory')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(getInventoryCurrencyQueryOptions())
    return { crumb: 'Inventory' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}

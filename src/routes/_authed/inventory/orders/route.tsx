import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/inventory/orders')({
  loader: () => ({ crumb: 'Orders' }),
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}

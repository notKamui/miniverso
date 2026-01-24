import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/inventory')({
  loader: () => ({ crumb: 'Inventory' }),
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}

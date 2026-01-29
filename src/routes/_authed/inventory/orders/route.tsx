import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/inventory/orders')({
  loader: () => ({ crumb: 'Orders' }),
})

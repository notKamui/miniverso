import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  loader: () => ({ crumb: 'Settings', noLink: true }),
})

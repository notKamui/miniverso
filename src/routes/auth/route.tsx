import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
  preload: false,
  loader: () => ({ crumb: 'Auth', noLink: true }),
})

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/time')({
  loader: () => ({
    crumb: 'Time recorder',
  }),
})

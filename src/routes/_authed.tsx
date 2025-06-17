import { useAuthenticate } from '@daveyplate/better-auth-ui'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  loader: ({ context: { user } }) => {
    if (!user)
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: 'sign-in' },
      })
  },
  component: () => {
    useAuthenticate()
    return <Outlet />
  },
})

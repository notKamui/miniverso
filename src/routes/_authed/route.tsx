import { authViewPaths, useAuthenticate } from '@daveyplate/better-auth-ui'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  loader: ({ context: { user } }) => {
    if (!user)
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: authViewPaths.SIGN_IN },
      })
  },
  component: function RouteComponent() {
    useAuthenticate()
    return <Outlet />
  },
})

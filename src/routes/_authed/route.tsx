import { viewPaths } from '@better-auth-ui/react/core'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  loader: ({ context: { user } }) => {
    if (!user)
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: viewPaths.auth.signIn },
      })
  },
})

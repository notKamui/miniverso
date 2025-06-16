import { authClient } from '@/lib/auth-client'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { AuthCard } from '@daveyplate/better-auth-ui'
import { createFileRoute, redirect } from '@tanstack/react-router'
import {} from 'react'

export const Route = createFileRoute('/auth/$pathname')({
  preload: false,
  beforeLoad: async ({ context: { user }, params: { pathname } }) => {
    if (!user && !['sign-in', 'sign-up'].includes(pathname)) {
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: 'sign-in' },
      })
    }
  },
  loader: async ({ context: { user, queryClient }, params: { pathname } }) => {
    if (user && pathname === 'sign-out') {
      await authClient.signOut()
      await queryClient.invalidateQueries({ queryKey: ['user'] })
    }

    return {
      crumbs: crumbs({ title: 'Auth', to: '/auth/$pathname' }),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return (
    <main className="container flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthCard pathname={pathname} />
    </main>
  )
}

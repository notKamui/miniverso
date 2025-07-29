import { AuthCard, authViewPaths } from '@daveyplate/better-auth-ui'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { crumbs } from '@/lib/hooks/use-crumbs'

export const Route = createFileRoute('/auth/$pathname')({
  preload: false,
  loader: async ({ context: { user, queryClient }, params: { pathname } }) => {
    if (
      !user &&
      ![authViewPaths.SIGN_IN, authViewPaths.SIGN_UP].includes(pathname)
    ) {
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: authViewPaths.SIGN_IN },
      })
    }

    if (user && pathname === authViewPaths.SIGN_OUT) {
      console.log('Signing out user...')

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
    <div className="mb-0 flex h-full flex-col items-center justify-center">
      <AuthCard pathname={pathname} />
    </div>
  )
}

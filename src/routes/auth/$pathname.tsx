import { viewPaths } from '@better-auth-ui/react/core'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Auth } from '@/components/auth/auth'

export const Route = createFileRoute('/auth/$pathname')({
  preload: false,
  loader: async ({ params: { pathname } }) => {
    if (!Object.values(viewPaths.auth).includes(pathname)) {
      throw redirect({ to: '/' })
    }

    // if (
    //   !user &&
    //   ![authViewPaths.SIGN_IN, authViewPaths.SIGN_UP, authViewPaths.FORGOT_PASSWORD].includes(
    //     pathname,
    //   )
    // ) {
    //   throw redirect({
    //     to: '/auth/$pathname',
    //     params: { pathname: authViewPaths.SIGN_IN },
    //   })
    // }

    // if (user && pathname === authViewPaths.SIGN_OUT) {
    //   await queryClient.invalidateQueries({ queryKey: ['user'] })
    // }

    return {
      crumb: 'Auth',
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return (
    <div className="mb-0 flex h-full flex-col items-center justify-center">
      <Auth path={pathname} socialLayout="grid" />
    </div>
  )
}

import { viewPaths } from '@better-auth-ui/react/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Auth } from '@/components/auth/auth'

export const Route = createFileRoute('/auth/$pathname')({
  preload: false,
  beforeLoad: async ({ params: { pathname } }) => {
    if (!Object.values(viewPaths.auth).includes(pathname)) {
      throw notFound()
    }
  },
  loader: ({ params: { pathname } }) => ({ crumb: pathname }),
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

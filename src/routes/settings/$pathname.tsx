import { viewPaths } from '@better-auth-ui/react/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Settings } from '@/components/settings/settings'

export const Route = createFileRoute('/settings/$pathname')({
  preload: false,
  beforeLoad: ({ params: { pathname } }) => {
    if (!Object.values(viewPaths.settings).includes(pathname)) {
      throw notFound()
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return (
    <main className="container p-4 md:p-6">
      <Settings path={pathname} />
    </main>
  )
}

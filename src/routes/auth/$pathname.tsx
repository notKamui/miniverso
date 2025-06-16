import { crumbs } from '@/lib/hooks/use-crumbs'
import { AuthCard } from '@daveyplate/better-auth-ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/$pathname')({
  loader: async () => {
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

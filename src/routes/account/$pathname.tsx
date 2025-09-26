import { AccountView } from '@daveyplate/better-auth-ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/account/$pathname')({
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return (
    <main className="container p-4 md:p-6">
      <AccountView pathname={pathname} />
    </main>
  )
}

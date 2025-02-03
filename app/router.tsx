import { DefaultCatchBoundary } from '@app/components/default-catch-boundary'
import { NotFound } from '@app/components/not-found'
import { routeTree } from '@app/gen/route-tree.gen'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

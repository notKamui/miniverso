import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { DefaultCatchBoundary } from '@/components/default-catch-boundary'
import { NotFound } from '@/components/not-found'
import { routeTree } from './routeTree.gen'
// oxlint-disable-next-line import/no-unassigned-import
import './styles.css'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: {
      user: null,
      queryClient,
    },
    scrollRestoration: true,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultStructuralSharing: false,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

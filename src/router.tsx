import './styles.css'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { DefaultCatchBoundary } from '@/components/default-catch-boundary'
import { NotFound } from '@/components/not-found'
import { routeTree } from './routeTree.gen'

const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes
      },
    },
  })

  const queryCache = queryClient.getQueryCache()
  const previousQueryOnError = queryCache.config.onError
  queryCache.config.onError = (error, query) => {
    if (isAbortError(error)) return
    previousQueryOnError?.(error, query)
  }

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

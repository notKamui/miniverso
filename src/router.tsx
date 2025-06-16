import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'
import { NotFound } from '@/components/not-found'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
})

export function createRouter() {
  const router = routerWithQueryClient(
    createTanstackRouter({
      routeTree,
      context: {
        user: null,
        queryClient,
      },
      scrollRestoration: true,
      defaultNotFoundComponent: () => <NotFound />,
      defaultPreload: 'intent',
      defaultPreloadStaleTime: 0,
      defaultStructuralSharing: true,
    }),
    queryClient,
  )

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

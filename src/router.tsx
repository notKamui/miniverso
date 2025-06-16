import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'
import { NotFound } from '@/components/not-found'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'

export const createRouter = () => {
  const queryClient = new QueryClient()

  const router = routerWithQueryClient(
    createTanstackRouter({
      routeTree,
      context: {
        queryClient,
      },
      scrollRestoration: true,
      defaultNotFoundComponent: () => <NotFound />,
      defaultPreloadStaleTime: 0,
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

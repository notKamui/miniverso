import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'
import { NotFound } from '@/components/not-found'

export const createRouter = () => {
  const router = createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

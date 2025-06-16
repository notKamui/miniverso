import { MainLayout } from '@/layouts/main'
import { authClient } from '@/lib/auth-client'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { Providers } from '@/providers'
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Miniverso',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = session.data?.user
    if (!user) {
      return {
        user: null,
        session: null,
      }
    }
    return {
      user,
      session: session.data?.session,
    }
  },
  loader: async ({ context: { user } }) => {
    return {
      user,
      crumbs: crumbs({ title: 'Home', to: '/' }),
    }
  },
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <MainLayout>
            <Outlet />
          </MainLayout>
        </Providers>
        <TanStackRouterDevtools />
        <Scripts />
      </body>
    </html>
  ),
})

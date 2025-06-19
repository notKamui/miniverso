import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { User } from 'better-auth'
import type { ReactNode } from 'react'
import { ClientHintCheck } from '@/components/client-hint-check'
import { MainLayout } from '@/layouts/main'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { useServerErrors } from '@/lib/hooks/use-server-errors'
import { themeQueryKey, useTheme } from '@/lib/hooks/use-theme'
import { cn } from '@/lib/utils'
import { Providers } from '@/providers'
import { userQueryOptions } from '@/server/functions/get-user'
import { requestInfoQueryOptions } from '@/server/functions/request-info'
import type { Theme } from '@/server/functions/theme'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{
  user: User | null
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
  beforeLoad: async ({ context: { queryClient } }) => {
    const [requestInfo, user] = await Promise.all([
      await queryClient.fetchQuery(requestInfoQueryOptions()),
      await queryClient.fetchQuery(userQueryOptions()),
    ])

    queryClient.setQueryData(themeQueryKey, requestInfo.userPreferences.theme)

    return { user, requestInfo }
  },
  loader: async ({ context: { user, requestInfo } }) => {
    return {
      user,
      requestInfo,
      crumbs: crumbs({ title: 'Home', to: '/' }),
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  useServerErrors()
  const theme = useTheme()

  return (
    <RootDocument theme={theme}>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </RootDocument>
  )
}

function RootDocument({
  children,
  theme,
}: {
  children: ReactNode
  theme: Theme
}) {
  return (
    <html lang="en" className={cn(theme)} suppressHydrationWarning>
      <head>
        <ClientHintCheck />
        <HeadContent />
      </head>
      <body className="min-h-svh antialiased">
        <Providers>{children}</Providers>
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}

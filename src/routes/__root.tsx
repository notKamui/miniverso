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
import { sidebarStateQueryKey } from '@/lib/hooks/use-sidebar-state'
import { themeQueryKey, useTheme } from '@/lib/hooks/use-theme'
import { cn } from '@/lib/utils/cn'
import { Providers } from '@/providers'
import { requestInfoQueryOptions } from '@/server/functions/request-info'
import { socialOAuthQueryOptions } from '@/server/functions/social-oauth'
import type { Theme } from '@/server/functions/theme'
import { userQueryOptions } from '@/server/functions/user'
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
    const [requestInfo, user, socialOAuth] = await Promise.all([
      queryClient.fetchQuery(requestInfoQueryOptions()),
      queryClient.fetchQuery(userQueryOptions()),
      queryClient.fetchQuery(socialOAuthQueryOptions()),
    ])

    return { user, requestInfo, socialOAuth }
  },
  loader: async ({
    context: { user, requestInfo, socialOAuth, queryClient },
  }) => {
    queryClient.setQueryData(themeQueryKey, requestInfo.userPreferences.theme)
    queryClient.setQueryData(
      sidebarStateQueryKey,
      requestInfo.userPreferences.sidebar,
    )

    return {
      user,
      requestInfo,
      crumbs: crumbs({ title: 'Home', to: '/' }),
      socialOAuth,
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
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}

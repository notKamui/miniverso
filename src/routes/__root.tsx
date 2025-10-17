import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { User } from 'better-auth'
import type { ReactNode } from 'react'
import { ClientHintCheck } from '@/components/client-hint-check'
import { DevTools } from '@/components/devtools'
import { MainLayout } from '@/layouts/main'
import { crumbs } from '@/lib/hooks/use-crumbs'
import { useServerErrors } from '@/lib/hooks/use-server-errors'
import { sidebarStateQueryKey } from '@/lib/hooks/use-sidebar-state'
import { themeQueryKey, useTheme } from '@/lib/hooks/use-theme'
import { cn } from '@/lib/utils/cn'
import { Providers } from '@/providers'
import { hcaptchaInfoQueryOptions } from '@/server/functions/hcaptcha'
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
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const [hcaptchaInfo, socialOAuth, requestInfo, user] = await Promise.all([
      queryClient.fetchQuery(hcaptchaInfoQueryOptions()),
      queryClient.fetchQuery(socialOAuthQueryOptions()),
      queryClient.fetchQuery(requestInfoQueryOptions()),
      queryClient.fetchQuery(userQueryOptions()),
    ])
    const { theme, sidebar } = requestInfo.userPreferences

    queryClient.setQueryData(themeQueryKey, theme)
    queryClient.setQueryData(sidebarStateQueryKey, sidebar)

    return { user, requestInfo, socialOAuth, hcaptchaInfo }
  },
  loader: async () => {
    return {
      crumbs: crumbs({ title: 'Home', link: { to: '/' } }),
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
        <DevTools />
        <Scripts />
      </body>
    </html>
  )
}

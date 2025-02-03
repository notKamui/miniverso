import { Cursor } from '@app/components/cursor'
import { RouterDevtools } from '@app/components/router-devtools'
import { ThemeProvider } from '@app/components/theme/provider'
import { Toaster } from '@app/components/ui/sonner'
import { crumbs } from '@app/hooks/use-crumbs'
import { useServerErrors } from '@app/hooks/use-server-errors'
import { MainLayout } from '@app/layouts/main'
import appCss from '@app/styles/index.css?url'
import { cn } from '@app/utils/cn'
import { tryAsync } from '@common/utils/try'
import { $getCursor } from '@server/functions/cursor'
import { $getTheme } from '@server/functions/theme'
import { $authenticate } from '@server/functions/user'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Meta, Scripts } from '@tanstack/start'
import { Suspense } from 'react'

export const Route = createRootRoute({
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
    const [error, result] = await tryAsync($authenticate())

    if (error) {
      return { session: null, user: null }
    }
    return { session: result.session, user: result.user }
  },
  loader: async ({ context: { user } }) => {
    const { uiTheme } = await $getTheme()
    return {
      uiTheme,
      user,
      crumbs: crumbs({ title: 'Home', to: '/' }),
      cursor: await $getCursor(),
    }
  },
  component: () => {
    const uiTheme = Route.useLoaderData({ select: (state) => state.uiTheme })

    useServerErrors()

    return (
      <html lang="en" className={cn(uiTheme)}>
        <head>
          <Meta />
        </head>
        <body>
          <ThemeProvider theme={uiTheme}>
            <MainLayout>
              <Outlet />
              <Toaster
                closeButton
                duration={5000}
                richColors
                visibleToasts={5}
              />
            </MainLayout>
            <Cursor />
          </ThemeProvider>
          <Suspense>
            <RouterDevtools position="bottom-right" />
          </Suspense>
          <Scripts />
        </body>
      </html>
    )
  },
})

import { viewPaths } from '@better-auth-ui/core'
import { ensureSession as ensureSessionClient } from '@better-auth-ui/react'
import { ensureSession as ensureSessionServer } from '@better-auth-ui/react/server'
import { QueryClient } from '@tanstack/query-core'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { Settings } from '@/components/auth/settings/settings'
import { auth } from '@/lib/auth'
import { authClient } from '@/lib/auth-client'
import { Collection } from '@/lib/utils/collection'

const _settingsPaths = { ...viewPaths.settings }

type TSettingsPaths = {
  [key in keyof typeof _settingsPaths]: string
}

const settingsPaths = Collection.invertRecord(_settingsPaths)

const settingsCrumbs: TSettingsPaths = {
  account: 'Account',
  security: 'Security',
}

const ensureSession = createIsomorphicFn()
  .server((queryClient: QueryClient) =>
    ensureSessionServer(queryClient, auth, { headers: getRequestHeaders() }),
  )
  .client((queryClient: QueryClient) => ensureSessionClient(queryClient, authClient))

export const Route = createFileRoute('/settings/$pathname')({
  preload: false,
  beforeLoad: async ({ params: { pathname }, context: { queryClient } }) => {
    if (!(pathname in settingsPaths)) {
      throw notFound()
    }

    const session = await ensureSession(queryClient)

    if (!session) {
      throw redirect({
        to: '/auth/$pathname',
        params: { pathname: 'sign-in' },
        search: { redirectTo: location.href },
      })
    }

    return { session }
  },
  loader: ({ params: { pathname } }) => ({ crumb: settingsCrumbs[settingsPaths[pathname]] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return <Settings path={pathname} />
}

import { viewPaths } from '@better-auth-ui/react/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Settings } from '@/components/settings/settings'
import { Collection } from '@/lib/utils/collection'

type TSettingsPaths = {
  [key in keyof typeof viewPaths.settings]: string
}

const settingsPaths = Collection.invertRecord(viewPaths.settings)

const settingsCrumbs: TSettingsPaths = {
  account: 'Account',
  security: 'Security',
}

export const Route = createFileRoute('/settings/$pathname')({
  preload: false,
  beforeLoad: ({ params: { pathname } }) => {
    if (!(pathname in settingsPaths)) {
      throw notFound()
    }
  },
  loader: ({ params: { pathname } }) => ({ crumb: settingsCrumbs[settingsPaths[pathname]] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return <Settings path={pathname} />
}

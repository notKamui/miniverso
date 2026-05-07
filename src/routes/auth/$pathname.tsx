import { viewPaths } from '@better-auth-ui/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Auth } from '@/components/auth/auth'
import { magicLinkPlugin } from '@/lib/auth/magic-link-plugin'
import { Collection } from '@/lib/utils/collection'

const _authPaths = { ...viewPaths.auth, ...magicLinkPlugin().viewPaths.auth }

type TAuthPaths = {
  [key in keyof typeof _authPaths]: string
}

const authPaths = Collection.invertRecord(_authPaths)

const authCrumbs: TAuthPaths = {
  signIn: 'Sign In',
  signUp: 'Sign Up',
  magicLink: 'Magic Link',
  forgotPassword: 'Forgot Password',
  resetPassword: 'Reset Password',
  signOut: 'Sign Out',
}

export const Route = createFileRoute('/auth/$pathname')({
  preload: false,
  beforeLoad: async ({ params: { pathname } }) => {
    if (!(pathname in authPaths)) {
      throw notFound()
    }
  },
  loader: ({ params: { pathname } }) => ({ crumb: authCrumbs[authPaths[pathname]] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { pathname } = Route.useParams()

  return (
    <div className="grid h-full place-items-center">
      <Auth path={pathname} socialLayout="grid" />
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { AuthProvider as BetterAuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import { deleteUserPlugin } from '@/lib/auth/delete-user-plugin'
import { magicLinkPlugin } from '@/lib/auth/magic-link-plugin'
import { multiSessionPlugin } from '@/lib/auth/multi-session-plugin'
import { passkeyPlugin } from '@/lib/auth/passkey-plugin'
import { themePlugin } from '@/lib/auth/theme-plugin'
import { useGlobalContext } from '@/lib/hooks/use-global-context'
import { themeQueryOptions, useUpdateTheme } from '@/lib/hooks/use-theme'
import { Theme } from '@/server/functions/theme'

const motionFeatures = () => import('@/lib/utils/motion-features').then((mod) => mod.default)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion strict features={motionFeatures}>
      <AuthProvider>
        {children}
        <Toaster closeButton duration={5000} richColors visibleToasts={5} />
      </AuthProvider>
    </LazyMotion>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { socialOAuth } = useGlobalContext()
  const socialOAuthProviders = Object.entries(socialOAuth ?? {})
    .filter(([name, enabled]) => enabled && name !== 'emailAndPassword')
    .map(([provider]) => provider)
  const navigate = useNavigate()
  const { data: theme } = useSuspenseQuery(themeQueryOptions())
  const { mutate: setTheme } = useUpdateTheme()

  return (
    <BetterAuthProvider
      authClient={authClient}
      plugins={[
        themePlugin({
          theme: theme ?? 'system',
          setTheme: (theme) => setTheme(theme as Theme | 'system'),
        }),
        deleteUserPlugin(),
        multiSessionPlugin(),
        magicLinkPlugin(),
        passkeyPlugin(),
      ]}
      emailAndPassword={{
        enabled: socialOAuth?.emailAndPassword,
        confirmPassword: true,
        forgotPassword: true,
        rememberMe: true,
        requireEmailVerification: true,
      }}
      socialProviders={socialOAuthProviders}
      redirectTo="/"
      navigate={navigate}
      Link={Link}
    >
      {children}
    </BetterAuthProvider>
  )
}

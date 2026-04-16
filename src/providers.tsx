import { AuthProvider as BetterAuthProvider } from '@better-auth-ui/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import { useGlobalContext } from '@/lib/hooks/use-global-context'
import { themeQueryOptions, useUpdateTheme } from './lib/hooks/use-theme'
import { Theme } from './server/functions/theme'

async function motionFeatures() {
  const mod = await import('@/lib/utils/motion-features')
  return mod.default
}

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
      appearance={{
        theme: theme ?? 'system',
        setTheme: (theme) => setTheme(theme as Theme | 'system'),
      }}
      emailAndPassword={{
        enabled: socialOAuth?.emailAndPassword,
        confirmPassword: true,
        forgotPassword: true,
        rememberMe: true,
        requireEmailVerification: true,
      }}
      multiSession
      socialProviders={socialOAuthProviders}
      redirectTo="/"
      navigate={navigate}
      Link={Link}
    >
      {children}
    </BetterAuthProvider>
  )
}

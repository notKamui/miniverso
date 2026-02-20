import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { Link, useRouter } from '@tanstack/react-router'
import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import { useGlobalContext } from '@/lib/hooks/use-global-context'

async function motionFeatures() {
  const mod = await import('@/lib/utils/motion-features')
  return mod.default
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { socialOAuth, hcaptchaInfo } = useGlobalContext()
  const socialOAuthProviders = Object.entries(socialOAuth ?? {})
    .filter(([, enabled]) => enabled)
    .map(([provider]) => provider)
  const captcha = hcaptchaInfo?.siteKey
    ? ({ provider: 'hcaptcha', siteKey: hcaptchaInfo.siteKey } as const)
    : undefined

  return (
    <LazyMotion strict features={motionFeatures}>
      <AuthQueryProvider>
        <AuthUIProviderTanstack
          authClient={authClient}
          navigate={(href) => router.navigate({ href })}
          replace={(href) => router.navigate({ href, replace: true })}
          Link={({ href, ...props }) => <Link to={href} {...props} />}
          social={{
            providers: socialOAuthProviders,
          }}
          credentials={socialOAuth.emailAndPassword}
          captcha={captcha}
        >
          {children}
          <Toaster closeButton duration={5000} richColors visibleToasts={5} />
        </AuthUIProviderTanstack>
      </AuthQueryProvider>
    </LazyMotion>
  )
}

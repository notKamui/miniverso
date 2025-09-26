import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { Link, useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import { useGlobalContext } from '@/lib/hooks/use-global-context'

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { socialOAuth, hcaptchaInfo } = useGlobalContext()
  const socialOAuthProviders = Object.entries(socialOAuth ?? {})
    .filter(([, enabled]) => enabled)
    .map(([provider]) => provider)
  const captcha = hcaptchaInfo
    ? ({ provider: 'hcaptcha', siteKey: hcaptchaInfo.siteKey } as const)
    : undefined

  return (
    <AuthQueryProvider>
      <AuthUIProviderTanstack
        authClient={authClient}
        navigate={(href) => router.navigate({ href })}
        replace={(href) => router.navigate({ href, replace: true })}
        Link={({ href, ...props }) => <Link to={href} {...props} />}
        social={{
          providers: socialOAuthProviders,
        }}
        captcha={captcha}
      >
        {children}
        <Toaster closeButton duration={5000} richColors visibleToasts={5} />
      </AuthUIProviderTanstack>
    </AuthQueryProvider>
  )
}

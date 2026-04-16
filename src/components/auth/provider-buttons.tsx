import { providerIcons, useAuth } from '@better-auth-ui/react'
import { getProviderName } from '@better-auth-ui/react/core'
import type { SocialProvider } from 'better-auth/social-providers'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export type ProviderButtonsProps = {
  isPending: boolean
  socialLayout?: SocialLayout
  signInSocial: (params: { provider: SocialProvider; callbackURL: string }) => void
}

export type SocialLayout = 'auto' | 'horizontal' | 'vertical' | 'grid'

/**
 * Render sign-in buttons for configured social providers.
 *
 * @param isPending - When true, disables all provider buttons.
 * @param socialLayout - Preferred layout for the provider buttons; when set to `"auto"` the layout is chosen based on the number of available providers.
 * @param signInSocial - Callback invoked with the provider and callbackURL when a button is clicked.
 * @returns A JSX element containing provider sign-in buttons.
 */
export function ProviderButtons({
  isPending,
  socialLayout = 'auto',
  signInSocial,
}: ProviderButtonsProps) {
  const { baseURL, localization, redirectTo, socialProviders } = useAuth()

  const callbackURL = `${baseURL}${redirectTo}`

  const resolvedSocialLayout = useMemo(() => {
    if (socialLayout === 'auto') {
      if (socialProviders?.length && socialProviders.length >= 4) {
        return 'horizontal'
      }

      return 'vertical'
    }

    return socialLayout
  }, [socialLayout, socialProviders?.length])

  return (
    <div
      className={cn(
        'gap-3',
        resolvedSocialLayout === 'grid' && 'grid grid-cols-2',
        resolvedSocialLayout === 'vertical' && 'flex flex-col',
        resolvedSocialLayout === 'horizontal' && 'flex flex-row flex-wrap',
      )}
    >
      {socialProviders?.map((provider) => {
        const ProviderIcon = providerIcons[provider]

        return (
          <Button
            key={provider}
            className={cn(resolvedSocialLayout === 'horizontal' && 'flex-1')}
            variant="outline"
            disabled={isPending}
            onClick={() => signInSocial({ provider, callbackURL })}
          >
            <ProviderIcon />

            {resolvedSocialLayout === 'vertical'
              ? localization.auth.continueWith.replace('{{provider}}', getProviderName(provider))
              : resolvedSocialLayout === 'grid'
                ? getProviderName(provider)
                : null}
          </Button>
        )
      })}
    </div>
  )
}

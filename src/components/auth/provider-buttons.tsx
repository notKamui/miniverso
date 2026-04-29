import { useAuth } from '@better-auth-ui/react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { ProviderButton } from './provider-button'

export type ProviderButtonsProps = {
  isPending?: boolean
  socialLayout?: SocialLayout
}

export type SocialLayout = 'auto' | 'horizontal' | 'vertical' | 'grid'

/**
 * Render sign-in buttons for configured social providers. Each button owns its own sign-in mutation.
 *
 * @param isPending - External pending state (e.g. parent form submitting) that disables all buttons.
 * @param socialLayout - Preferred layout for the provider buttons; when set to `"auto"` the layout is chosen based on the number of available providers.
 * @returns A JSX element containing provider sign-in buttons.
 */
export function ProviderButtons({ isPending, socialLayout = 'auto' }: ProviderButtonsProps) {
  const { socialProviders } = useAuth()

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
      {socialProviders?.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          isDisabled={isPending}
          label={
            resolvedSocialLayout === 'vertical'
              ? 'continueWith'
              : resolvedSocialLayout === 'grid'
                ? 'providerName'
                : 'none'
          }
          className={cn(resolvedSocialLayout === 'horizontal' && 'flex-1')}
        />
      ))}
    </div>
  )
}

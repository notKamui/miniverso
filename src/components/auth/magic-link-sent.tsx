import { useAuth, useAuthPlugin } from '@better-auth-ui/react'
import { useSyncExternalStore } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { magicLinkPlugin } from '@/lib/auth/magic-link-plugin'
import { cn } from '@/lib/utils/cn'
import { OpenEmailButton } from './open-email-button'

/** `sessionStorage` key the magic-link form stores the submitted email under. */
export const MAGIC_LINK_SENT_STORAGE_KEY = 'better-auth-ui.magic-link-sent'

export type MagicLinkSentProps = {
  className?: string
}

/**
 * Reads the magic-link-sent address from `sessionStorage` on the client and
 * returns an empty string during SSR.
 *
 * @returns The stored email address, or an empty string when unavailable.
 */
function useStoredMagicLinkEmail() {
  return useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem(MAGIC_LINK_SENT_STORAGE_KEY) ?? '',
    () => '',
  )
}

/**
 * Render a card confirming that a magic-link email was sent, with a button
 * to open the user's email provider.
 *
 * The target email is read from `sessionStorage` (set when the magic-link
 * form redirects here); the OpenEmail button is only shown when an email is
 * stored and resolves to a known provider.
 *
 * @param className - Additional CSS classes applied to the card
 * @returns The magic-link-sent card React element
 */
export function MagicLinkSent({ className }: MagicLinkSentProps) {
  const { basePaths, emailAndPassword, localization, viewPaths, Link } = useAuth()
  const { localization: magicLinkLocalization } = useAuthPlugin(magicLinkPlugin)

  const email = useStoredMagicLinkEmail()

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.checkYourEmailTitle}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <FieldDescription>
            {email
              ? magicLinkLocalization.magicLinkSentTo.replace('{{email}}', email)
              : magicLinkLocalization.magicLinkSent}
          </FieldDescription>

          {email && <OpenEmailButton email={email} />}
        </div>

        {emailAndPassword?.enabled && (
          <div className="mt-4 flex w-full flex-col items-center gap-3">
            <FieldDescription className="text-center">
              {localization.auth.needToCreateAnAccount}{' '}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
                className="underline underline-offset-4"
              >
                {localization.auth.signUp}
              </Link>
            </FieldDescription>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

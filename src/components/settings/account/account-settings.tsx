import { useAuth } from '@better-auth-ui/react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'
import { Appearance } from './appearance'
import { ChangeEmail } from './change-email'
import { ManageAccounts } from './manage-accounts'
import { UserProfile } from './user-profile'

export type AccountSettingsProps = {
  className?: string
}

/**
 * Renders the account settings layout.
 *
 * Uses `emailAndPassword`, `magicLink`, `appearance.setTheme`, and
 * `multiSession` from `useAuth()` to conditionally show sections:
 * - `UserProfile` always renders.
 * - `ChangeEmail` renders when `emailAndPassword?.enabled` or `magicLink` is truthy.
 * - `Appearance` renders when `setTheme` is truthy.
 * - `ManageAccounts` renders when `multiSession` is truthy.
 */
export function AccountSettings({
  className,
  ...props
}: AccountSettingsProps & ComponentProps<'div'>) {
  const {
    multiSession,
    emailAndPassword,
    magicLink,
    appearance: { setTheme },
  } = useAuth()

  return (
    <div className={cn('flex w-full flex-col gap-4 md:gap-6', className)} {...props}>
      <UserProfile />
      {(emailAndPassword?.enabled || magicLink) && <ChangeEmail />}
      {setTheme && <Appearance />}
      {multiSession && <ManageAccounts />}
    </div>
  )
}

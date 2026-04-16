'use client'

import { useAuth } from '@better-auth-ui/react'
import { cn } from '@/lib/utils/cn'
import { ActiveSessions } from './active-sessions'
import { ChangePassword } from './change-password'
import { DangerZone } from './danger-zone'
import { LinkedAccounts } from './linked-accounts'
import { Passkeys } from './passkeys'

export type SecuritySettingsProps = {
  className?: string
}

/**
 * Renders the security settings layout including password management, linked accounts, and active sessions.
 *
 * ChangePassword is rendered when password authentication is enabled; LinkedAccounts is rendered when social providers are present.
 * DangerZone is rendered when `deleteUser.enabled` is true in auth config.
 *
 * @param className - Optional additional CSS class names for the outer container.
 * @returns The security settings container as a JSX element.
 */
export function SecuritySettings({ className }: SecuritySettingsProps) {
  const { deleteUser, emailAndPassword, passkey, socialProviders } = useAuth()

  return (
    <div className={cn('flex w-full flex-col gap-4 md:gap-6', className)}>
      {emailAndPassword?.enabled && <ChangePassword />}
      {(socialProviders?.length ?? 0) > 0 && <LinkedAccounts />}
      {passkey && <Passkeys />}
      <ActiveSessions />
      {deleteUser?.enabled && <DangerZone />}
    </div>
  )
}

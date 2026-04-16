import {
  useAuth,
  useRevokeMultiSession,
  useSession,
  useSetActiveSession,
} from '@better-auth-ui/react'
import type { Session, User } from 'better-auth'
import { ArrowLeftRight, LogOut, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { UserView } from '@/components/user/user-view'

export type DeviceSession = {
  session: Session
  user: User
}

export type ManageAccountProps = {
  deviceSession?: DeviceSession | null
  isPending?: boolean
}

/**
 * Render a single account row with user info and switch/revoke controls.
 *
 * Shows the user's avatar and info. For the active session, shows a sign-out button.
 * For non-active sessions, shows a dropdown menu with switch and sign-out options.
 *
 * @param deviceSession - The device session object containing session and user data
 * @param isPending - Whether the device session is pending
 * @returns A JSX element containing the account row
 */
export function ManageAccount({ deviceSession, isPending }: ManageAccountProps) {
  const { localization } = useAuth()
  const { data: session } = useSession()

  const { mutate: setActiveSession, isPending: isSwitching } = useSetActiveSession({
    onError: (error) => toast.error(error.error?.message || error.message),
  })

  const { mutate: revokeSession, isPending: isRevoking } = useRevokeMultiSession({
    onError: (error) => toast.error(error.error?.message || error.message),
    onSuccess: () => toast.success(localization.settings.revokeSessionSuccess),
  })

  const isActive = deviceSession?.session.userId === session?.session.userId
  const isBusy = isSwitching || isRevoking

  return (
    <Card className="border-0 bg-transparent shadow-none ring-0">
      <CardContent className="flex items-center justify-between gap-3">
        <UserView user={deviceSession?.user} isPending={isPending} />

        {deviceSession && isActive && (
          <Button
            className="shrink-0"
            variant="outline"
            size="sm"
            onClick={() => revokeSession({ sessionToken: deviceSession.session.token })}
            disabled={isBusy}
          >
            {isRevoking ? <Spinner /> : <LogOut />}
            {localization.auth.signOut}
          </Button>
        )}

        {deviceSession && !isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={isBusy}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="min-w-fit">
              <DropdownMenuItem
                onClick={() =>
                  setActiveSession({
                    sessionToken: deviceSession.session.token,
                  })
                }
              >
                <ArrowLeftRight className="text-muted-foreground" />
                {localization.auth.switchAccount}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  revokeSession({
                    sessionToken: deviceSession.session.token,
                  })
                }
              >
                <LogOut className="text-muted-foreground" />
                {localization.auth.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  )
}

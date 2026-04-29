import { useAuth, useDeleteUser, useListAccounts } from '@better-auth-ui/react'
import { TriangleAlert } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'

export type DeleteUserProps = {
  className?: string
}

/**
 * Danger-zone card to delete the authenticated account, with a confirmation dialog and toasts.
 */
export function DeleteUser({ className }: DeleteUserProps) {
  const { basePaths, deleteUser: deleteUserConfig, localization, viewPaths, navigate } = useAuth()

  const { data: accounts } = useListAccounts()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')

  const hasCredentialAccount = accounts?.some((account) => account.providerId === 'credential')
  const needsPassword = !deleteUserConfig?.sendDeleteAccountVerification && hasCredentialAccount

  const { mutate: deleteUser, isPending } = useDeleteUser()

  const handleDialogOpenChange = (open: boolean) => {
    setConfirmOpen(open)
    setPassword('')
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const params = needsPassword ? { password } : {}

    deleteUser(params, {
      onSuccess: () => {
        setConfirmOpen(false)
        setPassword('')

        if (deleteUserConfig?.sendDeleteAccountVerification) {
          toast.success(localization.settings.deleteUserVerificationSent)
        } else {
          toast.success(localization.settings.deleteUserSuccess)
          navigate({
            to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
            replace: true,
          })
        }
      },
    })
  }

  return (
    <Card className={cn('border-destructive', className)}>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm leading-tight font-medium">{localization.settings.deleteUser}</p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {localization.settings.deleteUserDescription}
          </p>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={handleDialogOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={!accounts}>
              {localization.settings.deleteUser}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                  <TriangleAlert />
                </AlertDialogMedia>

                <AlertDialogTitle>{localization.settings.deleteUser}</AlertDialogTitle>

                <AlertDialogDescription>
                  {localization.settings.deleteUserDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {needsPassword && (
                <Field>
                  <Label htmlFor="delete-password">{localization.auth.password}</Label>

                  <Input
                    id="delete-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={localization.auth.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    required
                  />

                  <FieldError />
                </Field>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel>{localization.settings.cancel}</AlertDialogCancel>

                <AlertDialogAction variant="destructive">
                  {isPending && <Spinner />}

                  {localization.settings.deleteUser}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

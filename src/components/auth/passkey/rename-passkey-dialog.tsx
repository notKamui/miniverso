import type { PasskeyAuthClient } from '@better-auth-ui/core/plugins/passkey'
import { useAuth, useAuthPlugin } from '@better-auth-ui/react'
import { useUpdatePasskey } from '@better-auth-ui/react/plugins/passkey'
import type { SyntheticEvent } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { passkeyPlugin } from '@/lib/auth/passkey-plugin'
import type { ListedPasskey } from './delete-passkey-dialog'

export type RenamePasskeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  passkey: ListedPasskey
}

export function RenamePasskeyDialog({ open, onOpenChange, passkey }: RenamePasskeyDialogProps) {
  const { authClient, localization } = useAuth<PasskeyAuthClient>()
  const { localization: passkeyLocalization } = useAuthPlugin(passkeyPlugin)

  const updatePasskey = useUpdatePasskey(authClient, {
    onSuccess: () => onOpenChange(false),
  })

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextName = (formData.get('name') as string)?.trim()
    if (nextName) updatePasskey.mutate({ id: passkey.id, name: nextName })
  }

  const fieldId = `passkey-name-${passkey.id}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          key={open ? passkey.id : 'closed'}
          className="flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
          <DialogHeader>
            <DialogTitle>{passkeyLocalization.renamePasskey}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={fieldId}>{passkeyLocalization.name}</FieldLabel>
            <Input id={fieldId} name="name" defaultValue={passkey.name ?? ''} required />
          </Field>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: 'outline' })} type="button">
              {localization.settings.cancel}
            </DialogClose>
            <Button disabled={updatePasskey.isPending} type="submit">
              {updatePasskey.isPending && <Spinner />}
              {localization.settings.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

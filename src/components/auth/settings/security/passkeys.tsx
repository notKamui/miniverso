import {
  type PasskeyAuthClient,
  useAddPasskey,
  useAuth,
  useAuthPlugin,
  useListPasskeys,
} from '@better-auth-ui/react'
import { Fingerprint } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { passkeyPlugin } from '@/lib/auth/passkey-plugin'
import { cn } from '@/lib/utils/cn'
import { Passkey } from './passkey'

export type PasskeysProps = {
  className?: string
}

export function Passkeys({ className }: PasskeysProps) {
  const { authClient, localization } = useAuth()
  const { localization: passkeyLocalization } = useAuthPlugin(passkeyPlugin)

  const { data: passkeys, isPending } = useListPasskeys(authClient as PasskeyAuthClient)

  const { mutate: addPasskey, isPending: isAdding } = useAddPasskey(authClient as PasskeyAuthClient)

  const [nameOpen, setNameOpen] = useState(false)
  const [name, setName] = useState('')

  const handleDialogOpenChange = (open: boolean) => {
    setNameOpen(open)
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    addPasskey(
      { name: name.trim() || undefined },
      {
        onSuccess: () => {
          setNameOpen(false)
          setName('')
        },
      },
    )
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{passkeyLocalization.passkeys}</h2>

      <Card className={cn('p-0', className)}>
        <CardContent className="p-0">
          <Card className="border-0 bg-transparent shadow-none ring-0">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm leading-tight font-medium">
                  {passkeyLocalization.passkeysDescription}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {passkeyLocalization.passkeysInstructions}
                </p>
              </div>

              <AlertDialog open={nameOpen} onOpenChange={handleDialogOpenChange}>
                <AlertDialogTrigger asChild>
                  <Button className="shrink-0" size="sm" disabled={isPending}>
                    {passkeyLocalization.addPasskey}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <AlertDialogHeader>
                      <AlertDialogMedia>
                        <Fingerprint />
                      </AlertDialogMedia>

                      <AlertDialogTitle>{passkeyLocalization.addPasskey}</AlertDialogTitle>

                      <AlertDialogDescription>
                        {passkeyLocalization.passkeysInstructions}
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <Field>
                      <Label htmlFor="passkey-name">{passkeyLocalization.passkey}</Label>

                      <Input
                        id="passkey-name"
                        name="passkey-name"
                        placeholder={localization.settings.optional}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isAdding}
                      />

                      <FieldError />
                    </Field>

                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setName('')}>
                        {localization.settings.cancel}
                      </AlertDialogCancel>

                      <AlertDialogAction type="submit">
                        {isAdding && <Spinner />}

                        {passkeyLocalization.addPasskey}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {isPending ? (
            <>
              <Separator />
              <PasskeySkeleton />
            </>
          ) : (
            passkeys?.map((passkey) => (
              <div key={passkey.id}>
                <Separator />
                <Passkey passkey={passkey} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PasskeySkeleton() {
  return (
    <Card className="border-0 bg-transparent shadow-none ring-0">
      <CardContent className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-md" />

        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

import {
  type PasskeyAuthClient,
  useAuth,
  useAuthPlugin,
  useDeletePasskey,
} from '@better-auth-ui/react'
import { Fingerprint, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { passkeyPlugin } from '@/lib/auth/passkey-plugin'

export type PasskeyProps = {
  passkey: {
    id: string
    name?: string | null
    createdAt: Date
  }
}

export function Passkey({ passkey }: PasskeyProps) {
  const { authClient, localization } = useAuth()
  const { localization: passkeyLocalization } = useAuthPlugin(passkeyPlugin)

  const { mutate: deletePasskey, isPending } = useDeletePasskey(authClient as PasskeyAuthClient)

  const passkeyName = passkey.name || passkeyLocalization.passkey

  return (
    <Card className="border-0 bg-transparent shadow-none ring-0">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Fingerprint className="size-4.5" />
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-sm leading-tight font-medium">{passkeyName}</span>

          <span className="text-xs text-muted-foreground">
            {new Date(passkey.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>

        <Button
          className="ml-auto shrink-0"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => deletePasskey({ id: passkey.id })}
          aria-label={passkeyLocalization.deletePasskey.replace('{{name}}', passkeyName)}
        >
          {isPending ? <Spinner /> : <X />}
          {localization.settings.delete}
        </Button>
      </CardContent>
    </Card>
  )
}

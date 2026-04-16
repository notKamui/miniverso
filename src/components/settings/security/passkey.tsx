'use client'

import { useAuth, useDeletePasskey } from '@better-auth-ui/react'
import { Fingerprint, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export type PasskeyProps = {
  passkey: {
    id: string
    name?: string | null
    createdAt: Date
  }
}

export function Passkey({ passkey }: PasskeyProps) {
  const { localization } = useAuth()

  const { mutate: deletePasskey, isPending } = useDeletePasskey({
    onError: (error) => toast.error(error.error?.message || error.message),
  })

  return (
    <Card className="border-0 bg-transparent shadow-none ring-0">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Fingerprint className="size-4.5" />
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-sm leading-tight font-medium">
            {passkey.name || localization.auth.passkey}
          </span>

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
        >
          {isPending ? <Spinner /> : <X />}
          {localization.settings.delete}
        </Button>
      </CardContent>
    </Card>
  )
}

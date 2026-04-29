import { useAddPasskey, useAuth, useListUserPasskeys } from '@better-auth-ui/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'
import { Passkey } from './passkey'

export type PasskeysProps = {
  className?: string
}

export function Passkeys({ className }: PasskeysProps) {
  const { localization } = useAuth()

  const { data: passkeys, isPending } = useListUserPasskeys()

  const { mutate: addPasskey, isPending: isAdding } = useAddPasskey()

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{localization.settings.passkeys}</h2>

      <Card className={cn('p-0', className)}>
        <CardContent className="p-0">
          <Card className="border-0 bg-transparent shadow-none ring-0">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm leading-tight font-medium">
                  {localization.settings.passkeysDescription}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {localization.settings.passkeysInstructions}
                </p>
              </div>

              <Button
                className="shrink-0"
                size="sm"
                disabled={isPending || isAdding}
                onClick={() => addPasskey()}
              >
                {isAdding && <Spinner />}
                {localization.settings.addPasskey}
              </Button>
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

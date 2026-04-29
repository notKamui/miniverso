import { useAuth, useSignInPasskey } from '@better-auth-ui/react'
import { Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'

export type PasskeyButtonProps = {
  isPending: boolean
}

export function PasskeyButton({ isPending }: PasskeyButtonProps) {
  const { localization, redirectTo, navigate } = useAuth()

  const { mutate: signInPasskey, isPending: passkeyPending } = useSignInPasskey({
    onSuccess: () => navigate({ to: redirectTo }),
  })

  const isDisabled = isPending || passkeyPending

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isDisabled}
      className={cn('w-full', isDisabled && 'pointer-events-none opacity-50')}
      onClick={() => signInPasskey()}
    >
      {passkeyPending ? <Spinner /> : <Fingerprint />}
      {localization.auth.continueWith.replace('{{provider}}', localization.auth.passkey)}
    </Button>
  )
}

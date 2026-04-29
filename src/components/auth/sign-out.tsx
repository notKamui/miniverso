import { useAuth, useSignOut } from '@better-auth-ui/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'

export type SignOutProps = {
  className?: string
}

/**
 * Signs the current user out on mount and renders a centered spinner while the operation completes.
 *
 * @param className - Optional additional class names appended to the root element
 * @returns The spinner shown during sign-out
 */
export function SignOut({ className }: SignOutProps) {
  const { basePaths, navigate, viewPaths } = useAuth()

  const { mutate: signOut } = useSignOut({
    onError: (error) => {
      toast.error(error.error?.message || error.message)

      navigate({
        to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
        replace: true,
      })
    },
    onSuccess: () =>
      navigate({
        to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
        replace: true,
      }),
  })

  const hasSignedOut = useRef(false)

  useEffect(() => {
    if (hasSignedOut.current) return
    hasSignedOut.current = true

    signOut()
  }, [signOut])

  return <Spinner className={cn('mx-auto my-auto', className)} />
}

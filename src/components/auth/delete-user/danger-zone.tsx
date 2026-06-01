import { useAuth } from '@better-auth-ui/react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'
import { DeleteAccount } from './delete-account'

export type DangerZoneProps = {
  className?: string
}

/**
 * Renders the danger zone heading and {@link DeleteAccount}.
 * Registered as a `securityCard` by `deleteUserPlugin()`; gate by registering the plugin.
 */
export function DangerZone({
  className,
  ...props
}: DangerZoneProps & Omit<ComponentProps<'div'>, 'children' | 'className'>) {
  const { localization } = useAuth()

  return (
    <div className={cn('flex w-full flex-col', className)} {...props}>
      <h2 className="mb-3 text-sm font-semibold text-destructive">
        {localization.settings.dangerZone}
      </h2>

      <DeleteAccount />
    </div>
  )
}

import { useAuth } from '@better-auth-ui/react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'
import { DeleteUser } from './delete-user'

export type DangerZoneProps = Omit<ComponentProps<'div'>, 'children'>

/**
 * Renders the danger zone heading and {@link DeleteUser}.
 * Registered as a `securityCard` by `deleteUserPlugin()`; gate by registering the plugin.
 */
export function DangerZone({ className, ...props }: DangerZoneProps) {
  const { localization } = useAuth()

  return (
    <div className={cn('flex w-full flex-col', className)} {...props}>
      <h2 className="mb-3 text-sm font-semibold">{localization.settings.dangerZone}</h2>

      <DeleteUser />
    </div>
  )
}

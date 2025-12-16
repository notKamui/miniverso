'use client'

import { useGlobalContext } from '@/lib/hooks/use-global-context'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user } = useGlobalContext()
  const isAdmin = user?.role === 'admin'

  if (!isAdmin) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-semibold text-lg">Access Denied</h3>
          <p className="text-muted-foreground text-sm">
            You need administrator privileges to access this section.
          </p>
        </div>
      )
    )
  }

  return <>{children}</>
}

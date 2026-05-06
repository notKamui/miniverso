import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { UserButton } from '@/components/auth/user/user-button'
import { AppSidebar } from '@/components/nav/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { type Crumb, useCrumbs } from '@/lib/hooks/use-crumbs'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { useSidebarState, useUpdateSidebarState } from '@/lib/hooks/use-sidebar-state'
import { cn } from '@/lib/utils/cn'

export function MainLayout({ children }: { children: ReactNode }) {
  const breadcrumbs = useCrumbs()
  const isMobile = useIsMobile(true)
  const sidebarOpen = useSidebarState() === 'open'
  const { mutate: updateSidebarState } = useUpdateSidebarState()

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      open={sidebarOpen}
      onOpenChange={(open) => {
        updateSidebarState(open ? 'open' : 'closed')
      }}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 flex-row items-center justify-between border-b bg-background pr-1.5 pl-4 max-sm:bg-background/95 max-sm:backdrop-blur supports-backdrop-filter:max-sm:bg-background/80">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="z-50 -ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <CrumbLink
                    key={crumb.to}
                    crumb={crumb}
                    isLast={index === breadcrumbs.length - 1}
                  />
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <UserButton size={isMobile ? 'icon' : 'default'} className="max-sm:mr-2" align="end" />
          </div>
        </header>
        <main className="space-y-8 p-4 max-sm:h-auto max-sm:min-h-0 max-sm:w-screen max-sm:overflow-visible md:h-[calc(100vh-(--spacing(16)))] md:overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function CrumbLink({ crumb, isLast }: { crumb: Crumb; isLast: boolean }) {
  return (
    <>
      <BreadcrumbItem>
        {!isLast && !crumb.noLink ? (
          <BreadcrumbLink asChild>
            <Link to={crumb.to} params={crumb.params} from="/">
              {crumb.name}
            </Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage className={cn(crumb.noLink && 'text-muted-foreground')}>
            {crumb.name}
          </BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
    </>
  )
}

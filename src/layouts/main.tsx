import { UserButton } from '@daveyplate/better-auth-ui'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/nav/app-sidebar'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { type Crumb, useCrumbs } from '@/lib/hooks/use-crumbs'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import {
  useSidebarState,
  useUpdateSidebarState,
} from '@/lib/hooks/use-sidebar-state'

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
        <header className="flex flex-row items-center justify-between border-b bg-background pr-1.5 pl-4">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <SidebarTrigger className="z-50 -ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <CrumbLink
                    key={crumb.title}
                    crumb={crumb}
                    last={index === breadcrumbs.length - 1}
                  />
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <UserButton size={isMobile ? 'icon' : 'default'} variant="ghost" />
          </div>
        </header>
        <main className="h-[calc(100vh-(--spacing(16)))] space-y-8 overflow-auto p-4 max-sm:w-screen">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function CrumbLink({ crumb, last }: { crumb: Crumb; last: boolean }) {
  return (
    <>
      <BreadcrumbItem>
        {crumb.link && !last ? (
          <BreadcrumbLink asChild>
            <Link to={crumb.link.to} params={crumb.link.params} from="/">
              {crumb.title}
            </Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {!last && <BreadcrumbSeparator className="hidden md:block" />}
    </>
  )
}

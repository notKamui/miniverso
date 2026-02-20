import { UserButton } from '@daveyplate/better-auth-ui'
import { Link, linkOptions, useRouteContext } from '@tanstack/react-router'
import { ShieldIcon } from 'lucide-react'
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
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { type Crumb, useCrumbs } from '@/lib/hooks/use-crumbs'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { useSidebarState, useUpdateSidebarState } from '@/lib/hooks/use-sidebar-state'

export function MainLayout({ children }: { children: ReactNode }) {
  const breadcrumbs = useCrumbs()
  const isMobile = useIsMobile(true)
  const sidebarOpen = useSidebarState() === 'open'
  const { mutate: updateSidebarState } = useUpdateSidebarState()
  const isAdmin = useRouteContext({
    from: '__root__',
    select: ({ user }) => user?.role === 'admin',
  })

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
            <ThemeSwitcher />
            <UserButton
              size={isMobile ? 'icon' : 'default'}
              variant="ghost"
              additionalLinks={
                isAdmin
                  ? [
                      {
                        href: linkOptions({ to: '/admin' }).to,
                        label: 'Admin',
                        icon: <ShieldIcon />,
                        signedIn: true,
                      },
                    ]
                  : []
              }
            />
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
        {!isLast ? (
          <BreadcrumbLink asChild>
            <Link to={crumb.to} params={crumb.params} from="/">
              {crumb.name}
            </Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
    </>
  )
}

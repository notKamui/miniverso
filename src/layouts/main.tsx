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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { type Crumb, useCrumbs } from '@/lib/hooks/use-crumbs'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function MainLayout({ children }: { children: ReactNode }) {
  const breadcrumbs = useCrumbs()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 z-50" />
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
        {crumb.to && !last ? (
          <BreadcrumbLink asChild>
            <Link to={crumb.to}>{crumb.title}</Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {!last && <BreadcrumbSeparator className="hidden md:block" />}
    </>
  )
}

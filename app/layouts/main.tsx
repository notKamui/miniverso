import { AppSidebar } from '@app/components/nav/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@app/components/ui/sidebar'
import { type Crumb, useCrumbs } from '@app/hooks/use-crumbs'
import { Separator } from '@radix-ui/react-separator'
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
        <main className="h-screen space-y-8 p-4 max-sm:w-screen ">
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

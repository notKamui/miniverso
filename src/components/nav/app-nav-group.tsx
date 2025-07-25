import { Link, useLinkProps } from '@tanstack/react-router'
import { ChevronRightIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  type GlobalContext,
  useGlobalContext,
} from '@/lib/hooks/use-global-context'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { useUpdateSidebarState } from '@/lib/hooks/use-sidebar-state'
import type { FileRoutesByTo } from '@/routeTree.gen'

export type NavGroupItem<To extends keyof FileRoutesByTo = any> = {
  title: string
  icon: LucideIcon
  to: To
  items?: NavGroupSubItem[]
  condition?: (user: GlobalContext) => boolean
} & (FileRoutesByTo[To] extends { params: infer P }
  ? { params: P }
  : { params?: never })

export type NavGroupSubItem<To extends keyof FileRoutesByTo = any> = {
  title: string
  to: To
  condition?: (user: GlobalContext) => boolean
} & (FileRoutesByTo[To] extends { params: infer P }
  ? { params: P }
  : { params?: never })

export type AppNavGroupProps = {
  title: string
  items: NavGroupItem[]
  condition?: (user: GlobalContext) => boolean
}

export function AppNavGroup({ title, items, condition }: AppNavGroupProps) {
  const context = useGlobalContext()

  if (condition?.(context) === false) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(
          (item) =>
            item.condition?.(context) !== false && (
              <MenuItem key={item.title + item.to} item={item} />
            ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function MenuItem({ item }: { item: NavGroupItem }) {
  const isMobile = useIsMobile()
  const { mutate: updateSidebarState } = useUpdateSidebarState()
  const linkProps = (useLinkProps({ to: item.to }) as any)[
    'data-status'
  ] as string
  const defaultIsActive = linkProps === 'active' || linkProps === 'exact-active'
  const [isActive, setIsActive] = useState(defaultIsActive)

  useEffect(() => setIsActive(defaultIsActive), [defaultIsActive])

  function handleLinkClick() {
    if (isMobile) {
      updateSidebarState('closed')
    }
  }

  return (
    <Collapsible
      asChild
      open={isActive}
      onOpenChange={(open) => setIsActive(open)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <Link
            to={item.to}
            from="/"
            params={(item as any).params}
            onClick={handleLinkClick}
          >
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {item.items?.length && (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRightIcon />
                <span className="sr-only">Toggle {item.title} section</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link
                        to={subItem.to}
                        from="/"
                        params={(subItem as any).params}
                        onClick={handleLinkClick}
                      >
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        )}
      </SidebarMenuItem>
    </Collapsible>
  )
}

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
} from '@/hooks/use-global-context'
import type { FileRoutesByTo } from '@/routeTree.gen'
import { Link, useLinkProps } from '@tanstack/react-router'
import { ChevronRightIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export type NavGroupItem = {
  title: string
  icon: LucideIcon
  to: keyof FileRoutesByTo
  items?: NavGroupSubItem[]
  condition?: (user: GlobalContext) => boolean
}

export type NavGroupSubItem = {
  title: string
  to: keyof FileRoutesByTo
  condition?: (user: GlobalContext) => boolean
}

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
  const linkProps = (useLinkProps({ to: item.to }) as any)[
    'data-status'
  ] as string
  const defaultIsActive = linkProps === 'active' || linkProps === 'exact-active'
  const [isActive, setIsActive] = useState(defaultIsActive)

  useEffect(() => setIsActive(defaultIsActive), [defaultIsActive])

  return (
    <Collapsible
      asChild
      open={isActive}
      onOpenChange={(open) => setIsActive(open)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <Link to={item.to}>
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
                      <Link to={subItem.to}>
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

import { Link, type ToOptions, useLinkProps } from '@tanstack/react-router'
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

export type NavGroupItem = {
  title: string
  icon: LucideIcon
  items?: NavGroupSubItem[]
  condition?: (context: GlobalContext) => boolean
  link: ToOptions
}

export type NavGroupSubItem = {
  title: string
  condition?: (context: GlobalContext) => boolean
  link: ToOptions
}

export type AppNavGroupProps = {
  title: string
  items: NavGroupItem[]
  condition?: (context: GlobalContext) => boolean
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
        {items
          .filter((item) => item.condition?.(context) !== false)
          .map((item) => (
            <MenuItem key={item.title + item.link.to} item={item} />
          ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function MenuItem({ item }: { item: NavGroupItem }) {
  const isMobile = useIsMobile()
  const { mutate: updateSidebarState } = useUpdateSidebarState()
  const linkProps = (useLinkProps({ to: item.link.to }) as any)[
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
            to={item.link.to}
            from="/"
            params={item.link.params}
            search={item.link.search}
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
                        to={subItem.link.to}
                        from="/"
                        params={subItem.link.params}
                        search={subItem.link.search}
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

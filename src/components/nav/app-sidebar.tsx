import { ClockIcon, HomeIcon, StarIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import {
  AppNavGroup,
  type AppNavGroupProps,
} from '@/components/nav/app-nav-group'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { title } from '@/components/ui/typography'
import { env } from '@/lib/env/client'

const sections: AppNavGroupProps[] = [
  {
    title: 'Applications',
    items: [
      {
        title: 'Home',
        to: '/',
        icon: HomeIcon,
      },
      {
        title: 'Time recorder',
        to: '/time',
        icon: ClockIcon,
        items: [
          {
            title: 'Statistics',
            to: '/time/stats',
          },
        ],
        condition: ({ user }) => !!user,
      },
    ],
  },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <Header />
      <SidebarContent>
        {sections.map((section) => (
          <AppNavGroup key={section.title} {...section} />
        ))}
      </SidebarContent>
      <Footer />
    </Sidebar>
  )
}

function Header() {
  const { open } = useSidebar()
  const MotionIcon = motion.create(StarIcon)
  return (
    <SidebarHeader className="flex flex-row justify-between">
      <motion.h1
        className={title({ h: 1, class: 'px-1' })}
        animate={{
          opacity: open ? 1 : 0,
          x: open ? 0 : -100,
          width: open ? 'auto' : 0,
        }}
        transition={{
          duration: 0.2,
        }}
      >
        Miniverso
      </motion.h1>
      <div>
        <MotionIcon
          className="absolute inset-0 top-4 left-4 h-8 w-4"
          initial={{ opacity: open ? 0 : 1 }}
          animate={{ opacity: open ? 0 : 1 }}
        />
      </div>
    </SidebarHeader>
  )
}

function Footer() {
  const [currentYear] = useState(() => new Date().getFullYear())
  const { open } = useSidebar()

  return (
    <SidebarFooter className="overflow-hidden">
      <div
        className={`whitespace-nowrap px-2 text-muted-foreground text-xs transition-all duration-300 ease-out ${
          open
            ? 'w-auto translate-x-0 opacity-100'
            : '-translate-x-full w-0 opacity-0'
        }`}
      >
        v{env.VITE_APP_VERSION} - {currentYear} ©{' '}
        <a href="https://github.com/notKamui" className="hover:underline">
          notKamui
        </a>
      </div>
    </SidebarFooter>
  )
}

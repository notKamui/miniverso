import {
  AppNavGroup,
  type AppNavGroupProps,
} from '@app/components/nav/app-nav-group'
import { ThemeToggle } from '@app/components/theme/toggle'
import { title } from '@app/components/ui/primitives/typography'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@app/components/ui/sidebar'
import { useSidebar } from '@app/hooks/use-sidebar'
import {
  ClockIcon,
  HomeIcon,
  LogInIcon,
  LogOutIcon,
  StarIcon,
} from 'lucide-react'
import { motion } from 'motion/react'

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
  {
    title: 'Account',
    items: [
      {
        title: 'Log In',
        to: '/login',
        icon: LogInIcon,
        condition: ({ user }) => !user,
      },
      {
        title: 'Log Out',
        to: '/logout',
        icon: LogOutIcon,
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
  return (
    <SidebarFooter>
      <ThemeToggle />
    </SidebarFooter>
  )
}

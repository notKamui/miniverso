//import { ThemeToggle } from '@app/components/theme/toggle'
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
import { ClockIcon, HomeIcon, StarIcon } from 'lucide-react'
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
  return <SidebarFooter>{/* <ThemeToggle /> */}</SidebarFooter>
}

import { authViewPaths } from '@daveyplate/better-auth-ui'
import { createFileRoute, Link, type ToOptions } from '@tanstack/react-router'
import { link, title } from '@/components/ui/typography'
import {
  type GlobalContext,
  useGlobalContext,
} from '@/lib/hooks/use-global-context'
import { Time } from '@/lib/utils/time'

export const Route = createFileRoute('/')({
  loader: ({ context: { user } }) => ({ user }),
  component: RouteComponent,
})

function RouteComponent() {
  const isLoggedIn = Route.useLoaderData({ select: ({ user }) => !!user })

  return (
    <>
      <h2 className={title({ h: 1 })}>Welcome to Miniverso</h2>
      {isLoggedIn ? <Main /> : <NotLoggedIn />}
    </>
  )
}

function NotLoggedIn() {
  return (
    <div>
      <p>
        Please{' '}
        <Link
          to="/auth/$pathname"
          from="/"
          params={{ pathname: authViewPaths.SIGN_IN }}
          className={link()}
        >
          sign in
        </Link>{' '}
        or{' '}
        <Link
          to="/auth/$pathname"
          from="/"
          params={{ pathname: authViewPaths.SIGN_UP }}
          className={link()}
        >
          sign up
        </Link>{' '}
        to continue using the rest of the application.
      </p>
    </div>
  )
}

type Application = {
  title: string
  description: string
  condition?: (context: GlobalContext) => boolean
  link: ToOptions
}

const applications: Application[] = [
  {
    title: 'Time recorder',
    description: 'Record your time and track your progress',
    link: {
      to: '/time/{-$day}',
      search: {
        tz: Time.getOffset(),
      },
    },
  },
  {
    title: 'Admin Dashboard',
    description: 'Manage users and system settings',
    condition: ({ user }) => user?.role === 'admin',
    link: {
      to: '/admin',
    },
  },
]

function Main() {
  const context = useGlobalContext()

  return (
    <div className="flex flex-col gap-4">
      <h3 className={title({ h: 3 })}>Applications</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {applications
          .filter((app) => app.condition?.(context) !== false)
          .map((app) => (
            <div key={app.link.to} className="container rounded-md border p-4">
              <h4 className={title({ h: 4 })}>{app.title}</h4>
              <p>{app.description}</p>
              <Link
                to={app.link.to}
                params={app.link.params}
                search={app.link.search}
                from="/"
                className={link()}
              >
                Open
              </Link>
            </div>
          ))}
      </div>
    </div>
  )
}

import { authViewPaths } from '@daveyplate/better-auth-ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { link, title } from '@/components/ui/typography'
import type { FileRoutesByTo } from '@/routeTree.gen'

export const Route = createFileRoute('/')({
  loader: async ({ context: { user } }) => {
    return {
      user,
    }
  },
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
  to: keyof FileRoutesByTo
  params?: any
  title: string
  description: string
}
const applications: Application[] = [
  {
    to: '/time/{-$day}',
    params: { day: undefined },
    title: 'Time recorder',
    description: 'Record your time and track your progress',
  },
]

function Main() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className={title({ h: 3 })}>Applications</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {applications.map((app) => (
          <div key={app.to} className="container rounded-md border p-4">
            <h4 className={title({ h: 4 })}>{app.title}</h4>
            <p>{app.description}</p>
            <Link to={app.to} params={app.params} from="/" className={link()}>
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

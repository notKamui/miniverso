import { link, title } from '@app/components/ui/primitives/typography'
import type { FileRoutesByTo } from '@app/gen/route-tree.gen'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: ({ context: { session } }) => {
    return { session }
  }
})

function RouteComponent() {
  const session = Route.useLoaderData({ select: (state) => state.session })

  return (
    <>
      <h2 className={title({ h: 1 })}>Welcome to Miniverso</h2>
      {session ? <Main /> : <NotLoggedIn />}
    </>
  )
}

function NotLoggedIn() {
  return (
    <div>
      <p>
        Please{' '}
        <Link to="/login" className={link()}>
          log in
        </Link>{' '}
        or{' '}
        <Link to="/sign-up" className={link()}>
          sign up
        </Link>{' '}
        to continue using the rest of the application.
      </p>
    </div>
  )
}

type Application = {
  to: keyof FileRoutesByTo
  title: string
  description: string
}
const applications: Application[] = [
  {
    to: '/time',
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
            <Link to={app.to} className={link()}>
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

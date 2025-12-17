import { createFileRoute, Link } from '@tanstack/react-router'
import { AdminGuard } from '@/components/admin/admin-guard'
import { link, title } from '@/components/ui/typography'
import type { FileRoutesByTo } from '@/routeTree.gen'

export const Route = createFileRoute('/_authed/admin/')({
  loader: async () => ({ crumb: 'Admin Dashboard' }),
  component: RouteComponent,
})

type AdminPanel = {
  to: keyof FileRoutesByTo
  params?: any
  title: string
  description: string
}

const panels: AdminPanel[] = [
  {
    to: '/admin/users',
    title: 'Users',
    description: 'View and manage all users',
  },
]

function RouteComponent() {
  return (
    <AdminGuard>
      <div className="flex flex-col gap-4">
        <h3 className={title({ h: 3 })}>Panels</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <div key={panel.to} className="container rounded-md border p-4">
              <h4 className={title({ h: 4 })}>{panel.title}</h4>
              <p>{panel.description}</p>
              <Link
                to={panel.to}
                params={panel.params}
                from="/"
                className={link()}
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  )
}

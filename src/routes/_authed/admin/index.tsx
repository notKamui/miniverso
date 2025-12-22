import { createFileRoute, Link, type ToOptions } from '@tanstack/react-router'
import { AdminGuard } from '@/components/admin/admin-guard'
import { link, title } from '@/components/ui/typography'

export const Route = createFileRoute('/_authed/admin/')({
  component: RouteComponent,
})

type AdminPanel = {
  title: string
  description: string
  link: ToOptions
}

const panels: AdminPanel[] = [
  {
    title: 'Users',
    description: 'View and manage all users',
    link: { to: '/admin/users' },
  },
  {
    title: 'Export / Import',
    description: 'Export application data for backup or migration',
    link: { to: '/admin/export' },
  },
]

function RouteComponent() {
  return (
    <AdminGuard>
      <div className="flex flex-col gap-4">
        <h3 className={title({ h: 3 })}>Panels</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <div
              key={panel.link.to}
              className="container rounded-md border p-4"
            >
              <h4 className={title({ h: 4 })}>{panel.title}</h4>
              <p>{panel.description}</p>
              <Link
                to={panel.link.to}
                params={panel.link.params}
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

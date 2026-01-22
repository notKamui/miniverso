import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { title } from '@/components/ui/typography'

export const Route = createFileRoute('/_authed/admin')({
  loader: async ({ context: { user } }) => {
    if (user?.role !== 'admin') {
      throw notFound()
    }
    return { crumb: 'Admin' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className={title({ h: 1 })}>Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage users and system settings</p>
      </div>

      <Outlet />
    </div>
  )
}

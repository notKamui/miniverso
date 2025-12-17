import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'

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
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users and system settings
          </p>
        </div>

        <Outlet />
      </div>
    </div>
  )
}

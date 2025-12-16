import { createFileRoute } from '@tanstack/react-router'
import { AdminGuard } from '@/components/admin/admin-guard'
import { UsersList } from '@/components/admin/users-list'
import { $getAllUsers } from '@/server/functions/admin'

export const Route = createFileRoute('/_authed/admin/')({
  loader: async () => {
    const users = await $getAllUsers()
    return { users }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { users } = Route.useLoaderData()

  return (
    <AdminGuard>
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage users and system settings
            </p>
          </div>

          <UsersList users={users} />
        </div>
      </div>
    </AdminGuard>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { UsersList } from '@/components/admin/users-list'
import { $getAllUsers } from '@/server/functions/admin'

export const Route = createFileRoute('/_authed/admin/users')({
  loader: async () => {
    const users = await $getAllUsers()
    return {
      users,
      crumb: 'Users',
    }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { users } = Route.useLoaderData()

  return <UsersList users={users} />
}

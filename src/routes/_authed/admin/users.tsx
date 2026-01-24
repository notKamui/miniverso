import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as z from 'zod'
import { UsersList } from '@/components/admin/users-list'
import {
  $deleteUsers,
  adminUsersQueryKey,
  getUsersQueryOptions,
} from '@/server/functions/admin/users'

export const Route = createFileRoute('/_authed/admin/users')({
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(5),
    q: z.string().trim().optional(),
    role: z.enum(['all', 'admin', 'user']).optional(),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const { page, size, q, role } = search

    const usersPage = await queryClient.fetchQuery(
      getUsersQueryOptions({
        page,
        size,
        search: (q?.length ?? 0) < 1 ? undefined : q,
        role: role === 'all' ? undefined : role,
      }),
    )

    return { usersPage, crumb: 'Users' }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const navigate = useNavigate()
  const deleteUsers = useServerFn($deleteUsers)
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    usersPage: { items: users, page, size, total, totalPages },
  } = Route.useLoaderData({ select: ({ usersPage }) => ({ usersPage }) })
  const { q, role } = Route.useSearch()

  async function setSearch(next: {
    q?: string | undefined
    role?: 'all' | 'admin' | 'user' | undefined
    page?: number | undefined
    size?: number | undefined
  }) {
    await navigate({
      to: '.',
      search: {
        q,
        role,
        page,
        size,
        ...next,
      },
    })
  }

  return (
    <div className="space-y-4">
      <UsersList
        users={users}
        page={page}
        size={size}
        total={total}
        totalPages={totalPages}
        q={q}
        role={role}
        setSearch={setSearch}
        onDelete={async (id) => {
          if (!confirm('Are you sure you want to delete this user?')) return
          await deleteUsers({ data: { ids: [id] } })
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
            router.invalidate(),
          ])
        }}
      />
    </div>
  )
}

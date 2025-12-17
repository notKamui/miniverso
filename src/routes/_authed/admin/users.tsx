import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { UsersList } from '@/components/admin/users-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUsersQueryOptions } from '@/server/functions/admin/users'

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
  const {
    usersPage: { items: users, page, size, total, totalPages },
  } = Route.useLoaderData({ select: ({ usersPage }) => ({ usersPage }) })
  const { q, role } = Route.useSearch()

  function setSearch(next: {
    q?: string | undefined
    role?: 'all' | 'admin' | 'user' | undefined
    page?: number | undefined
    size?: number | undefined
  }) {
    navigate({
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <label htmlFor="search" className="mb-1 block font-medium text-sm">
            Search
          </label>
          <Input
            name="search"
            value={q ?? ''}
            placeholder="Name or email"
            onChange={(e) => setSearch({ q: e.target.value, page: 1 })}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="role" className="mb-1 block font-medium text-sm">
            Role
          </label>
          <Select
            name="role"
            value={role}
            onValueChange={(v: 'all' | 'admin' | 'user') =>
              setSearch({ role: v, page: 1 })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" defaultValue="all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(q || role) && (
          <Button
            variant="ghost"
            className="sm:self-auto"
            onClick={() =>
              setSearch({ q: undefined, role: undefined, page: 1 })
            }
          >
            Clear
          </Button>
        )}
        <div className="grow" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setSearch({ page: page - 1 })}
          >
            Previous
          </Button>
          <div className="text-muted-foreground text-sm">
            Page {page} / {totalPages} • {total} users
          </div>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setSearch({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      <UsersList users={users} />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setSearch({ page: page - 1 })}
        >
          Previous
        </Button>
        <div className="text-muted-foreground text-sm">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setSearch({ page: page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

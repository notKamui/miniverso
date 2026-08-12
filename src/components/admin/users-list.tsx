import { useSelector } from '@tanstack/react-store'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  type ColumnDef,
  type ColumnVisibilityState,
  functionalUpdate,
  metaHelper,
  type PaginationState,
  type ReactTable,
  type Row,
  rowPaginationFeature,
  tableFeatures,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import type { InferSelectModel } from 'drizzle-orm'
import { ChevronDown, ChevronLeft, ChevronRight, MoreVerticalIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDebouncedEffect } from '@/lib/hooks/use-debounce'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import type { user } from '@/server/db/schema'

function formatDate(date: string | Date) {
  return Time.from(date).formatDay({ short: true })
}

type User = InferSelectModel<typeof user>

type UsersRoleFilter = 'all' | 'admin' | 'user'

export type UsersListProps = {
  users: User[]
  page: number // 1-based
  size: number
  total: number
  totalPages: number
  q?: string
  role?: UsersRoleFilter
  setSearch: (next: {
    q?: string | undefined
    role?: UsersRoleFilter | undefined
    page?: number | undefined
    size?: number | undefined
  }) => void
  onDelete?: (id: string) => void
}

type ColumnMeta = {
  label: string
}

const usersTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<ColumnMeta>(),
})

const usersColumnHelper = createColumnHelper<typeof usersTableFeatures, User>()

function createUserColumns(
  onDelete?: (id: string) => void,
): ColumnDef<typeof usersTableFeatures, User, any>[] {
  return Collection.buildArray(
    usersColumnHelper.accessor('name', {
      id: 'user',
      meta: { label: 'User' },
      header: 'User',
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="flex min-w-0 items-center gap-3">
            {u.image && (
              <img src={u.image} alt={u.name} className="h-8 w-8 shrink-0 rounded-full" />
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{u.name}</div>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <div className="truncate text-sm text-muted-foreground">
                    ID: {u.id.slice(0, 8)}...
                  </div>
                </TooltipTrigger>
                <TooltipContent>{u.id}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )
      },
    }),
    usersColumnHelper.accessor('email', {
      id: 'email',
      meta: { label: 'Email' },
      header: 'Email',
      cell: ({ row }) => <div className="truncate">{row.original.email}</div>,
    }),
    usersColumnHelper.accessor('role', {
      id: 'role',
      meta: { label: 'Role' },
      header: 'Role',
      cell: ({ row }) => {
        const u = row.original
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              u.role === 'admin'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {u.role}
          </span>
        )
      },
    }),
    usersColumnHelper.accessor('emailVerified', {
      id: 'status',
      meta: { label: 'Status' },
      header: 'Status',
      cell: ({ row }) => {
        const u = row.original
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              u.emailVerified
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}
          >
            {u.emailVerified ? 'Verified' : 'Unverified'}
          </span>
        )
      },
    }),
    usersColumnHelper.accessor('createdAt', {
      id: 'joined',
      meta: { label: 'Joined' },
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    }),
    onDelete != null &&
      usersColumnHelper.display({
        id: 'actions',
        meta: { label: 'Actions' },
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const u = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="Open action menu" variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <button
                      type="button"
                      className="w-full text-destructive"
                      onClick={() => onDelete(u.id)}
                    >
                      <Trash2Icon className="mr-2 h-4 w-4" /> Delete
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      }),
  )
}

export function UsersList({
  users,
  page,
  size,
  total,
  totalPages,
  q,
  role,
  setSearch,
  onDelete,
}: UsersListProps) {
  const [searchInput, setSearchInput] = useState(q ?? '')
  useDebouncedEffect(
    () => {
      const next = searchInput.trim().length > 0 ? searchInput.trim() : undefined
      if ((next ?? '') === (q ?? '')) return
      setSearch({ q: next, page: 1 })
    },
    [searchInput, q, setSearch],
    350,
  )

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({})

  const columns = useMemo(() => createUserColumns(onDelete), [onDelete])
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(page - 1, 0), pageSize: size }),
    [page, size],
  )

  const table = useTable({
    features: usersTableFeatures,
    data: users,
    columns,

    manualPagination: true,
    rowCount: total,
    pageCount: totalPages,

    manualFiltering: true,

    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = functionalUpdate(updater, pagination)
      const nextPage = next.pageIndex + 1
      const nextSize = next.pageSize

      setSearch({
        page: nextSize !== size ? 1 : nextPage,
        size: nextSize,
      })
    },
    onColumnVisibilityChange: setColumnVisibility,

    state: {
      pagination,
      columnVisibility,
    },
  })

  const roleValue: UsersRoleFilter = role ?? 'all'

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="users-search" className="mb-1 block text-sm font-medium">
            Search
          </label>
          <Input
            id="users-search"
            name="users-search"
            value={searchInput}
            placeholder="Name or email"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="users-role" className="mb-1 block text-sm font-medium">
            Role
          </label>
          <Select
            name="users-role"
            value={roleValue}
            onValueChange={(v: UsersRoleFilter) => setSearch({ role: v, page: 1 })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(q || (role && role !== 'all')) && (
          <Button
            variant="destructive"
            className="sm:self-auto"
            onClick={() => {
              setSearchInput('')
              setSearch({ q: undefined, role: undefined, page: 1 })
            }}
          >
            Clear
          </Button>
        )}

        <div className="grow" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <table.Subscribe selector={(s) => s.columnVisibility}>
            {() => (
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      >
                        {column.columnDef.meta?.label ?? column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            )}
          </table.Subscribe>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <table.Subscribe selector={(s) => s.columnVisibility}>
              {() =>
                table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      if (!header.column.getIsVisible()) return null
                      return (
                        <TableHead key={header.id} className="whitespace-nowrap">
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))
              }
            </table.Subscribe>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table
                .getRowModel()
                .rows.map((row) => <UserRow key={row.id} table={table} row={row} />)
            ) : (
              <table.Subscribe selector={(s) => s.columnVisibility}>
                {() => (
                  <TableRow>
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      className="h-24 text-center"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </table.Subscribe>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-4">
          <Button
            variant={!table.getCanPreviousPage() ? 'ghost' : 'outline'}
            size="icon"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} / {Math.max(totalPages, 1)} • {total} users
          </div>
          <Button
            variant={!table.getCanNextPage() ? 'ghost' : 'outline'}
            size="icon"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

function UserRow({
  table,
  row,
}: {
  table: ReactTable<typeof usersTableFeatures, User>
  row: Row<typeof usersTableFeatures, User>
}) {
  useSelector(table.atoms.columnVisibility)
  return (
    <TableRow>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="align-middle">
          <table.FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  )
}

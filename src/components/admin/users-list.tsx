'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { InferSelectModel } from 'drizzle-orm'
import { MoreVerticalIcon, Trash2Icon } from 'lucide-react'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Time } from '@/lib/utils/time'
import type { user } from '@/server/db/schema'

function formatDate(date: string | Date) {
  return Time.from(date).formatDay({ short: true })
}

type User = InferSelectModel<typeof user>

interface UsersListProps {
  users: User[]
  onDelete?: (id: string) => void
}

function createUserColumns(onDelete?: (id: string) => void): ColumnDef<User>[] {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            {user.image && (
              <img
                src={user.image}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium">{user.name}</div>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <div className="text-muted-foreground text-sm">
                    ID: {user.id.slice(0, 8)}...
                  </div>
                </TooltipTrigger>
                <TooltipContent>{user.id}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )
      },
      size: 250,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 250,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
              user.role === 'admin'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {user.role}
          </span>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'emailVerified',
      header: 'Status',
      cell: ({ row }) => {
        const user = row.original
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
              user.emailVerified
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}
          >
            {user.emailVerified ? 'Verified' : 'Unverified'}
          </span>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => {
        const user = row.original
        return (
          <span className="text-muted-foreground text-sm">
            {formatDate(user.createdAt)}
          </span>
        )
      },
      size: 120,
    },
  ]

  if (onDelete) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open action menu for row"
                variant="ghost"
                size="icon"
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="w-full text-destructive"
                  onClick={() => onDelete(user.id)}
                >
                  <Trash2Icon /> Delete
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 60,
    })
  }

  return columns
}

export function UsersList({ users, onDelete }: UsersListProps) {
  const columns = createUserColumns(onDelete)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">Users</h2>
      </div>

      <DataTable columns={columns} data={users} emptyMessage="No users found" />
    </div>
  )
}

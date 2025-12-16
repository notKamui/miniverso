'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface User {
  id: string
  name: string
  email: string
  role: string
  emailVerified: boolean
  image: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface UsersListProps {
  users: User[]
}

export function UsersList({ users }: UsersListProps) {
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      // Sort admins first, then by creation date
      if (a.role === 'admin' && b.role !== 'admin') return -1
      if (b.role === 'admin' && a.role !== 'admin') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [users])

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">Users</h2>
        <div className="text-muted-foreground text-sm">
          Total: {users.length} users
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {user.image && (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <div>
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
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
                      user.role === 'admin'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}
                  >
                    {user.emailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(user.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

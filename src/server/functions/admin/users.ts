import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { validate } from '@/lib/utils/validate'
import { paginated } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { $$admin } from '@/server/middlewares/admin'

const GetUsersSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin', 'user']).optional(),
})

export function getUsersQueryOptions({
  page,
  size,
  search,
  role,
}: z.infer<typeof GetUsersSchema>) {
  return queryOptions({
    queryKey: ['admin', 'users', { page, size, search, role }] as const,
    queryFn: ({ signal }) =>
      $getUsers({ signal, data: { page, size, search, role } }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const $getUsers = createServerFn({ method: 'GET' })
  .middleware([$$admin])
  .inputValidator(validate(GetUsersSchema))
  .handler(async ({ data: { page, size, search, role } }) => {
    const conditions = [] as (SQL | undefined)[]
    if (search) {
      const pattern = sql`%${search}%`
      conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)))
    }
    if (role) {
      conditions.push(eq(user.role, role))
    }

    return await paginated({
      table: user,
      where: and(...conditions),
      orderBy: asc(user.createdAt),
      page,
      size,
    })
  })

import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { z } from 'zod'
import { validate } from '@/lib/utils/validate'
import { db } from '@/server/db'
import { user } from '@/server/db/schema/auth'
import { $$admin } from '@/server/middlewares/admin'

export const $getUsers = createServerFn({ method: 'GET' })
  .middleware([$$admin])
  .inputValidator(
    validate(
      z.object({
        page: z.number().int().min(1).default(1),
        size: z.number().int().min(1).max(100).default(20),
        search: z.string().trim().min(1).max(200).optional(),
        role: z.enum(['admin', 'user']).optional(),
      }),
    ),
  )
  .handler(async ({ data: { page, size, search, role } }) => {
    const conditions = [] as any[]
    if (search) {
      const pattern = `%${search}%`
      conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)))
    }
    if (role) {
      conditions.push(eq(user.role, role))
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .where(where as any)

    const items = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(where as any)
      .orderBy(desc(user.createdAt))
      .limit(size)
      .offset((page - 1) * size)

    return {
      items,
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    }
  })

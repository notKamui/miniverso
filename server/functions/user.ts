import { SignInSchema, SignUpSchema } from '@common/forms/user'
import type { UUID } from '@common/utils/uuid'
import { db, takeUniqueOrNull } from '@server/db'
import { usersTable } from '@server/db/schema'
import '@server/middlewares/global'
import { $$rateLimit } from '@server/middlewares/rate-limit'
import { $$session } from '@server/middlewares/session'
import { hashPassword, verifyPassword } from '@server/utils/password'
import { badRequest } from '@server/utils/response'
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from '@server/utils/session'
import { validate } from '@server/utils/validate'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'
import { eq } from 'drizzle-orm'

export const $signUp = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit])
  .validator(validate(SignUpSchema, { async: true }))
  .handler(async ({ data }) => {
    const { username, password } = await data
    const hashedPassword = await hashPassword(password)
    const user = await db
      .insert(usersTable)
      .values({ username, hashedPassword })
      .returning({ id: usersTable.id, username: usersTable.username })
      .then(takeUniqueOrNull)

    if (!user) badRequest('User already exists', 400)

    await loginUser(user.id)
  })

export const $signIn = createServerFn({ method: 'POST' })
  .middleware([$$rateLimit])
  .validator(validate(SignInSchema))
  .handler(async ({ data: { username, password } }) => {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1)
      .then(takeUniqueOrNull)

    if (!user) return await invalidCredentials()

    const passwordMatch = await verifyPassword(password, user.hashedPassword)
    if (!passwordMatch) return await invalidCredentials()

    await loginUser(user.id)
  })

export const $signOut = createServerFn({ method: 'POST' })
  .middleware([$$session])
  .handler(async () => {
    setSessionTokenCookie('', new Date(0))
    throw redirect({
      to: '/login',
      statusCode: 200,
    })
  })

export const $authenticate = createServerFn({ method: 'GET' })
  .middleware([$$session])
  .handler(({ context: { session, user } }) => {
    return {
      session,
      user,
    }
  })

async function loginUser(userId: UUID) {
  const token = generateSessionToken()
  const session = await createSession(token, userId)
  setSessionTokenCookie(token, session.expiresAt)

  throw redirect({
    to: '/',
    statusCode: 200,
  })
}

async function invalidCredentials(): Promise<never> {
  await sleep(1000)
  badRequest('Invalid credentials', 401)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

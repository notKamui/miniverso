import { createMiddleware } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { badRequest } from '@/lib/utils/response'

export const $$auth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { headers } = getWebRequest()
    const session = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true },
    })

    if (!session) {
      badRequest('Unauthorized', 401)
    }

    return await next({ context: { user: session.user } })
  },
)

import { auth } from '@/lib/auth'
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'

export const $getUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { headers } = getWebRequest()
  const session = await auth.api.getSession({
    headers,
  })
  return session?.user ?? null
})

import '@/global-middleware'

import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const userQueryKey = ['user'] as const

export function userQueryOptions() {
  return queryOptions({
    queryKey: userQueryKey,
    queryFn: ({ signal }) => $getUser({ signal }),
    staleTime: 0,
  })
}

export const $getUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { headers } = getWebRequest()
  const session = await auth.api.getSession({
    headers,
  })
  return session?.user ?? null
})

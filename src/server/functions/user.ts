import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
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
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({
    headers,
  })
  return session?.user ?? null
})

import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getHints } from '@/components/client-hint-check'
import { $getSidebarState } from '@/server/functions/sidebar'
import { $getTheme } from '@/server/functions/theme'

export const requestInfoQueryKey = ['requestInfo'] as const

export function requestInfoQueryOptions() {
  return queryOptions({
    queryKey: requestInfoQueryKey,
    queryFn: $getRequestInfo,
  })
}

export const $getRequestInfo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    return {
      hints: getHints(request),
      userPreferences: {
        sidebar: await $getSidebarState(),
        theme: await $getTheme(),
      },
    }
  },
)

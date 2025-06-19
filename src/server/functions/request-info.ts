import '@/global-middleware'

import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { getHints } from '@/components/client-hint-check'
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
    const request = getWebRequest()
    return {
      hints: getHints(request),
      userPreferences: {
        theme: await $getTheme(),
      },
    }
  },
)

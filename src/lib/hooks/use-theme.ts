import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useGlobalContext } from '@/lib/hooks/use-global-context'
import { requestInfoQueryKey } from '@/server/functions/request-info'
import { $getTheme, $setTheme, type Theme } from '@/server/functions/theme'

export const themeQueryKey = ['theme'] as const

export function themeQueryOptions() {
  return queryOptions({
    queryKey: themeQueryKey,
    queryFn: $getTheme,
  })
}

export function useTheme() {
  const { requestInfo } = useGlobalContext()
  const { data: theme } = useSuspenseQuery(themeQueryOptions())

  function getBrowserPreferredTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  return theme ?? requestInfo?.hints.theme ?? getBrowserPreferredTheme()
}

export function useUpdateTheme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (theme: Theme | 'system') => $setTheme({ data: theme }),
    onMutate: async (theme) => {
      await queryClient.cancelQueries({ queryKey: themeQueryKey })
      const previousTheme = queryClient.getQueryData(themeQueryKey)
      const nextTheme = theme === 'system' ? null : theme
      queryClient.setQueryData(themeQueryKey, nextTheme)
      return { previousTheme }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(themeQueryKey, context?.previousTheme)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: themeQueryKey }),
        queryClient.invalidateQueries({ queryKey: requestInfoQueryKey }),
      ])
    },
  })
}

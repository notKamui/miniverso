import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

export function createOptimisticMutationHelpers(
  queryClient: QueryClient,
  router: AnyRouter,
  ...queryKeys: readonly (readonly unknown[])[]
) {
  return {
    onMutate: async () => {
      await Promise.all(queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key })))
      const previousData = queryKeys.flatMap((key) => queryClient.getQueriesData({ queryKey: key }))
      return { previousData }
    },
    onError: (
      _err: Error,
      _variables: unknown,
      context?: { previousData: [readonly unknown[], unknown][] },
    ) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
    },
    onSettled: async () => {
      await Promise.all([
        ...queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
        router.invalidate(),
      ])
    },
  }
}

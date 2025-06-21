import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  $getSidebarState,
  $setSidebarState,
  type SidebarState,
} from '@/server/functions/sidebar'

export const sidebarStateQueryKey = ['sidebarState'] as const

export function sidebarStateQueryOptions() {
  return queryOptions({
    queryKey: sidebarStateQueryKey,
    queryFn: $getSidebarState,
  })
}

export function useSidebarState() {
  const { data: sidebarState } = useSuspenseQuery(sidebarStateQueryOptions())
  return sidebarState
}

export function useUpdateSidebarState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (state: SidebarState) => $setSidebarState({ data: state }),
    onMutate: async (state) => {
      await queryClient.cancelQueries({ queryKey: sidebarStateQueryKey })
      const previousSidebarState =
        queryClient.getQueryData(sidebarStateQueryKey)
      queryClient.setQueryData(sidebarStateQueryKey, state)
      return { previousSidebarState }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        sidebarStateQueryKey,
        context?.previousSidebarState,
      )
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: sidebarStateQueryKey })
    },
  })
}

export function useToggleSidebarState() {
  const sidebarState = useSidebarState()
  const { mutate: updateSidebarState } = useUpdateSidebarState()
  return () => {
    const newState = sidebarState === 'open' ? 'closed' : 'open'
    updateSidebarState(newState)
  }
}

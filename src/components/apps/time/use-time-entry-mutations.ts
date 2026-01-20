import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createOptimisticMutationHelpers } from '@/lib/hooks/use-optimistic-mutation'
import { Time } from '@/lib/utils/time'
import type { TimeEntry } from '@/server/db/schema/time'
import {
  $createTimeEntry,
  $updateTimeEntry,
  timeEntriesQueryKey,
  timeStatsQueryKey,
} from '@/server/functions/time-entry'

type UseTimeEntryMutationsProps = {
  currentEntry: TimeEntry | null
  setCurrentEntry: (entry: TimeEntry | null) => void
}

export function useTimeEntryMutations({
  currentEntry,
  setCurrentEntry,
}: UseTimeEntryMutationsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const helpers = createOptimisticMutationHelpers(
    queryClient,
    router,
    timeEntriesQueryKey,
    timeStatsQueryKey,
  )

  const createMutation = useMutation({
    mutationFn: (startedAt: Time) => $createTimeEntry({ data: { startedAt } }),
    onMutate: async (startedAt) => {
      const context = await helpers.onMutate()

      const optimisticEntry: TimeEntry = {
        id: `temp-${Date.now()}`,
        userId: '',
        startedAt,
        endedAt: null,
        description: null,
      }

      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) =>
          old ? [optimisticEntry, ...old] : [optimisticEntry],
      )

      setCurrentEntry(optimisticEntry)
      return context
    },
    onError: (err, variables, context) => {
      helpers.onError(err, variables, context)
      setCurrentEntry(null)
    },
    onSuccess: setCurrentEntry,
    onSettled: helpers.onSettled,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; endedAt?: Time; description?: string }) =>
      $updateTimeEntry({ data }),
    onMutate: async (variables) => {
      const context = await helpers.onMutate()

      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) =>
          old?.map((entry) =>
            entry.id === variables.id
              ? {
                  ...entry,
                  endedAt: variables.endedAt ?? entry.endedAt,
                  description: variables.description ?? entry.description,
                }
              : entry,
          ),
      )

      setCurrentEntry(null)
      return context
    },
    onError: (err, variables, context) => {
      helpers.onError(err, variables, context)
      if (currentEntry) setCurrentEntry(currentEntry)
    },
    onSettled: helpers.onSettled,
  })

  return {
    createMutation,
    updateMutation,
    start: () => createMutation.mutateAsync(Time.now()),
    end: (description: string) => {
      if (!currentEntry) return
      const trimmed = description.trim()
      return updateMutation.mutateAsync({
        id: currentEntry.id,
        endedAt: Time.now(),
        description: trimmed || undefined,
      })
    },
    isPending: createMutation.isPending || updateMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  $createProduct,
  $updateProduct,
  productsQueryKey,
} from '@/server/functions/inventory/products'

export function useProductMutations(productId: string | undefined, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  const createMut = useMutation({
    mutationFn: $createProduct,
    onMutate: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
      const previousData = queryClient.getQueryData(productsQueryKey)
      return { previousData }
    },
    onSuccess: async () => {
      toast.success('Product created')
      onSuccess?.()
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(productsQueryKey, context?.previousData)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] }),
      ])
    },
  })

  const updateMut = useMutation({
    mutationFn: $updateProduct,
    onMutate: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] }),
      ])
      const previousData = queryClient.getQueryData(productsQueryKey)
      return { previousData }
    },
    onSuccess: async () => {
      toast.success('Product updated')
      onSuccess?.()
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(productsQueryKey, context?.previousData)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] }),
      ])
    },
  })

  return { createMut, updateMut }
}

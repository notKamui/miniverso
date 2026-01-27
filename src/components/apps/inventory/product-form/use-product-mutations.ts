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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] }),
      ])
      toast.success('Product created')
      onSuccess?.()
    },
  })

  const updateMut = useMutation({
    mutationFn: $updateProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] }),
      ])
      toast.success('Product updated')
      onSuccess?.()
    },
  })

  return { createMut, updateMut }
}

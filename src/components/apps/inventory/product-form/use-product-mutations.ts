import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { $createProduct, $updateProduct, productsQueryKey } from '@/server/functions/inventory'

export function useProductMutations(productId: string | undefined, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  const createMut = useMutation({
    mutationFn: $createProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKey })
      toast.success('Product created')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: $updateProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKey })
      if (productId) {
        void queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId] })
      }
      toast.success('Product updated')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return { createMut, updateMut }
}

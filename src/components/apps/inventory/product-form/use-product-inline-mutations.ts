import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ProductFormValues } from '@/lib/forms/product'
import {
  $createInventoryTag,
  $createProductionCostLabel,
  inventoryTagsQueryKey,
  productionCostLabelsQueryKey,
} from '@/server/functions/inventory'

type FormLike = { state: { values: ProductFormValues } }

type Refs = {
  tagIdsSetRef: React.MutableRefObject<((v: string[]) => void) | null>
  productionCostsSetRef: React.MutableRefObject<
    ((v: { labelId: string; amount: string }[]) => void) | null
  >
}

type Setters = {
  setNewTagName: (v: string) => void
  setNewLabelName: (v: string) => void
}

export function useProductInlineMutations(form: FormLike, refs: Refs, setters: Setters) {
  const queryClient = useQueryClient()

  const createTagMut = useMutation({
    mutationFn: $createInventoryTag,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      const set = refs.tagIdsSetRef.current
      if (set) {
        const current = form.state.values.tagIds ?? []
        set([...current, data.id])
      }
      setters.setNewTagName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createLabelMut = useMutation({
    mutationFn: $createProductionCostLabel,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      const set = refs.productionCostsSetRef.current
      if (set) {
        const current = form.state.values.productionCosts ?? []
        set([...current, { labelId: data.id, amount: '0' }])
      }
      setters.setNewLabelName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return { createTagMut, createLabelMut }
}

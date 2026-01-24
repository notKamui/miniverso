import { useForm } from '@tanstack/react-form'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useComboboxAnchor } from '@/components/ui/combobox'
import { productFormSchema } from '@/lib/forms/product'
import {
  getInventoryTagsQueryOptions,
  getProductionCostLabelsQueryOptions,
} from '@/server/functions/inventory'
import { ProductFormActions } from './product-form-actions'
import { ProductFormBasicFields } from './product-form-basic-fields'
import { ProductFormPricing } from './product-form-pricing'
import { ProductFormProductionCosts } from './product-form-production-costs'
import { ProductFormTagIds } from './product-form-tag-ids'
import { getProductFormDefaultValues, type ProductFormProps } from './types'
import { useProductInlineMutations } from './use-product-inline-mutations'
import { useProductMutations } from './use-product-mutations'

export function ProductForm({ productId, existing: existingProp, onSuccess }: ProductFormProps) {
  const isEdit = Boolean(productId)
  const existing = existingProp

  const tagIdsSetRef = useRef<((v: string[]) => void) | null>(null)
  const productionCostsSetRef = useRef<((v: { labelId: string; amount: string }[]) => void) | null>(
    null,
  )

  const [newTagName, setNewTagName] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const chipsAnchorRef = useComboboxAnchor()

  const { createMut, updateMut } = useProductMutations(productId, onSuccess)

  const form = useForm({
    defaultValues: getProductFormDefaultValues(existing),
    onSubmit: async ({ value }) => {
      const parsed = productFormSchema.safeParse(value)
      if (!parsed.success) {
        const first = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message
        toast.error(typeof first === 'string' ? first : 'Invalid form')
        return
      }
      const payload = {
        ...parsed.data,
        productionCosts: parsed.data.productionCosts.filter((r) => r.labelId),
      }
      if (isEdit) {
        await updateMut.mutateAsync({ data: { ...payload, id: productId! } })
      } else {
        await createMut.mutateAsync({ data: payload })
      }
    },
  })

  const { createTagMut, createLabelMut } = useProductInlineMutations(
    form,
    { tagIdsSetRef, productionCostsSetRef },
    { setNewTagName, setNewLabelName },
  )

  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())
  const { data: labels = [] } = useSuspenseQuery(getProductionCostLabelsQueryOptions())

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await form.handleSubmit()
      }}
      className="flex max-w-xl flex-col gap-6"
    >
      <ProductFormBasicFields form={form} />
      <ProductFormPricing form={form} />
      <ProductFormTagIds
        form={form}
        tags={tags}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        createTagMut={createTagMut}
        tagIdsSetRef={tagIdsSetRef}
        chipsAnchorRef={chipsAnchorRef}
      />
      <ProductFormProductionCosts
        form={form}
        labels={labels}
        newLabelName={newLabelName}
        setNewLabelName={setNewLabelName}
        createLabelMut={createLabelMut}
        productionCostsSetRef={productionCostsSetRef}
      />
      <ProductFormActions
        form={form}
        isEdit={isEdit}
        existing={existing}
        productId={productId}
        updateMut={updateMut}
        onSuccess={onSuccess}
      />
    </form>
  )
}

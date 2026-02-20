import { useForm } from '@tanstack/react-form'
import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useComboboxAnchor } from '@/components/ui/combobox'
import { productFormSchema, type ProductFormValues } from '@/lib/forms/product'
import { getInventoryTagsQueryOptions } from '@/server/functions/inventory/inventory-tags'
import { getProductionCostLabelsQueryOptions } from '@/server/functions/inventory/production-cost-labels'
import { type $getProduct } from '@/server/functions/inventory/products'
import { ProductFormActions } from './product-form-actions'
import { ProductFormBasicFields } from './product-form-basic-fields'
import { ProductFormBundleItems } from './product-form-bundle-items'
import { ProductFormPricing } from './product-form-pricing'
import { ProductFormProductionCosts } from './product-form-production-costs'
import { ProductFormTagIds } from './product-form-tag-ids'
import { useProductMutations } from './use-product-mutations'

export type ProductFormExisting = Awaited<ReturnType<typeof $getProduct>>

export type ProductFormProps = {
  productId?: string
  existing?: ProductFormExisting
  duplicateFrom?: ProductFormExisting
  onSuccess?: () => void
}

function getProductFormDefaultValues(existing?: ProductFormExisting): ProductFormValues {
  if (existing == null) {
    return {
      name: '',
      description: '',
      sku: '',
      priceTaxFree: '',
      vatPercent: '20',
      kind: 'simple',
      quantity: '0',
      tagIds: [],
      productionCosts: [],
      bundleItems: [],
    }
  }
  return {
    name: existing.product.name,
    description: existing.product.description != null ? existing.product.description : '',
    sku: existing.product.sku ?? '',
    priceTaxFree: String(existing.product.priceTaxFree),
    vatPercent: String(existing.product.vatPercent),
    kind: existing.product.kind ?? 'simple',
    quantity: String(existing.product.quantity),
    tagIds: existing.tags.map((t) => t.id),
    productionCosts: existing.productionCosts.map((c) => ({
      labelId: c.labelId,
      amount: String(c.amount),
    })),
    bundleItems: existing.bundleItems.map((b) => ({
      productId: b.productId,
      quantity: String(b.quantity),
    })),
  }
}

function getProductFormDefaultValuesForDuplicate(existing: ProductFormExisting): ProductFormValues {
  const base = getProductFormDefaultValues(existing)
  return { ...base, name: `${base.name} (copy)`, sku: `${base.sku}-cpy` }
}

export function ProductForm({ productId, existing, duplicateFrom, onSuccess }: ProductFormProps) {
  const isEdit = Boolean(productId)
  const chipsAnchorRef = useComboboxAnchor()
  const { createMut, updateMut } = useProductMutations(productId, onSuccess)

  const form = useForm({
    defaultValues: duplicateFrom
      ? getProductFormDefaultValuesForDuplicate(duplicateFrom)
      : getProductFormDefaultValues(existing),
    onSubmit: async ({ value }) => {
      const parsed = productFormSchema.safeParse(value)
      if (!parsed.success) {
        const first = parsed.error.issues[0]?.message
        toast.error(typeof first === 'string' ? first : 'Invalid form')
        return
      }
      const payload = {
        ...parsed.data,
        productionCosts: parsed.data.productionCosts.filter((r) => r.labelId),
        bundleItems:
          parsed.data.kind === 'bundle' ? parsed.data.bundleItems.filter((r) => r.productId) : [],
      }
      if (isEdit) {
        await updateMut.mutateAsync({ data: { ...payload, id: productId! } })
      } else {
        await createMut.mutateAsync({ data: payload })
      }
    },
  })

  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())
  const { data: labels = [] } = useSuspenseQuery(getProductionCostLabelsQueryOptions())

  return (
    <form
      onKeyDown={(e) => {
        if (
          e.key === 'Enter' &&
          (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault()
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await form.handleSubmit()
      }}
      className="flex max-w-xl flex-col gap-6"
    >
      <ProductFormBasicFields form={form} />
      <ProductFormPricing form={form} />
      <form.Subscribe selector={(s) => s.values.kind}>
        {(kind) =>
          kind === 'bundle' ? <ProductFormBundleItems form={form} productId={productId} /> : null
        }
      </form.Subscribe>
      <ProductFormTagIds form={form} tags={tags} chipsAnchorRef={chipsAnchorRef} />
      <ProductFormProductionCosts form={form} labels={labels} />
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

import { useForm } from '@tanstack/react-form'
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productFormSchema, type ProductFormValues } from '@/lib/forms/product'
import {
  $createInventoryTag,
  $createProduct,
  $createProductionCostLabel,
  $getProduct,
  $updateProduct,
  getInventoryTagsQueryOptions,
  getProductionCostLabelsQueryOptions,
  inventoryTagsQueryKey,
  priceTaxIncluded,
  productionCostLabelsQueryKey,
  productsQueryKey,
} from '@/server/functions/inventory'

type ProductFormExisting = Awaited<ReturnType<typeof $getProduct>>

type ProductFormProps = {
  productId?: string
  existing?: ProductFormExisting
  onSuccess?: () => void
}

function getDefaultValues(existing?: ProductFormExisting): ProductFormValues {
  if (existing == null) {
    return {
      name: '',
      description: '',
      sku: '',
      priceTaxFree: '',
      vatPercent: '20',
      quantity: '0',
      tagIds: [],
      productionCosts: [],
    }
  }
  return {
    name: existing.product.name,
    description: existing.product.description != null ? existing.product.description : '',
    sku: existing.product.sku ?? '',
    priceTaxFree: String(existing.product.priceTaxFree),
    vatPercent: String(existing.product.vatPercent),
    quantity: String(existing.product.quantity),
    tagIds: existing.tags.map((t) => t.id),
    productionCosts: existing.productionCosts.map((c) => ({
      labelId: c.labelId,
      amount: String(c.amount),
    })),
  }
}

export function ProductForm({ productId, existing: existingProp, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(productId)
  const existing = existingProp

  const tagIdsSetRef = useRef<((v: string[]) => void) | null>(null)
  const productionCostsSetRef = useRef<((v: { labelId: string; amount: string }[]) => void) | null>(
    null,
  )

  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())
  const { data: labels = [] } = useSuspenseQuery(getProductionCostLabelsQueryOptions())

  const [newTagName, setNewTagName] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const chipsAnchorRef = useComboboxAnchor()

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
      void queryClient.invalidateQueries({ queryKey: [...productsQueryKey, productId!] })
      toast.success('Product updated')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const form = useForm({
    defaultValues: getDefaultValues(existing),
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

  const createTagMut = useMutation({
    mutationFn: $createInventoryTag,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      const set = tagIdsSetRef.current
      if (set) {
        const current = form.state.values.tagIds ?? []
        set([...current, data.id])
      }
      setNewTagName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const createLabelMut = useMutation({
    mutationFn: $createProductionCostLabel,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      const set = productionCostsSetRef.current
      if (set) {
        const current = form.state.values.productionCosts ?? []
        set([...current, { labelId: data.id, amount: '0' }])
      }
      setNewLabelName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await form.handleSubmit()
      }}
      className="flex max-w-xl flex-col gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput form={form} name="name" label="Name" required placeholder="Product name" />
        <FormInput form={form} name="sku" label="SKU" required placeholder="e.g. SKU-001" />
      </div>

      <TextInput
        form={form}
        name="description"
        label="Description"
        rows={2}
        placeholder="Optional"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormInput
          form={form}
          name="priceTaxFree"
          label="Price (ex. tax) €"
          type="number"
          step="0.01"
          min={0}
          required
        />
        <FormInput
          form={form}
          name="vatPercent"
          label="VAT %"
          type="number"
          step="0.01"
          min={0}
          max={100}
          required
        />
        <form.Subscribe selector={(s) => [s.values.priceTaxFree, s.values.vatPercent]}>
          {([ptf, vat]) => {
            const priceExcl = Number.parseFloat(String(ptf ?? '')) || 0
            const vatNum = Number.parseFloat(String(vat ?? '')) || 0
            const priceIncl = priceTaxIncluded(priceExcl, vatNum)
            return (
              <div className="space-y-2">
                <Label>Price (incl. tax) €</Label>
                <p className="flex h-9 items-center text-muted-foreground">
                  {priceIncl.toFixed(2)}
                </p>
              </div>
            )
          }}
        </form.Subscribe>
      </div>

      <FormInput
        form={form}
        name="quantity"
        label="Quantity in stock"
        type="number"
        min={0}
        step={1}
        required
      />

      <div className="space-y-2">
        <Label>Tags</Label>
        <form.Field name="tagIds">
          {(field) => {
            tagIdsSetRef.current = field.handleChange
            return (
              <>
                <Combobox
                  multiple
                  value={field.state.value ?? []}
                  onValueChange={(v) => field.handleChange(Array.isArray(v) ? v : [])}
                >
                  <ComboboxChips ref={chipsAnchorRef}>
                    {(field.state.value ?? []).map((id) => {
                      const t = tags.find((x) => x.id === id)
                      return <ComboboxChip key={id}>{t?.name ?? id}</ComboboxChip>
                    })}
                    <ComboboxChipsInput placeholder="Add tag…" />
                  </ComboboxChips>
                  <ComboboxContent anchor={chipsAnchorRef}>
                    <ComboboxList>
                      {tags.map((t) => (
                        <ComboboxItem key={t.id} value={t.id}>
                          {t.name}
                        </ComboboxItem>
                      ))}
                      <ComboboxEmpty>No tags. Add one below.</ComboboxEmpty>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name"
                    className="max-w-[200px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const n = newTagName.trim()
                      if (n) createTagMut.mutate({ data: { name: n, color: '#6b7280' } })
                    }}
                    disabled={!newTagName.trim() || createTagMut.isPending}
                  >
                    Create tag
                  </Button>
                </div>
              </>
            )
          }}
        </form.Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Production costs</Label>
          <div className="flex gap-2">
            <Input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="New label"
              className="max-w-[140px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const n = newLabelName.trim()
                if (n) createLabelMut.mutate({ data: { name: n, color: '#6b7280' } })
              }}
              disabled={!newLabelName.trim() || createLabelMut.isPending}
            >
              Create label
            </Button>
          </div>
        </div>
        <form.Field name="productionCosts" mode="array">
          {(field) => {
            productionCostsSetRef.current = field.handleChange
            const rows = field.state.value ?? []
            return (
              <div className="space-y-2">
                {rows.map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <form.Field name={`productionCosts[${i}].labelId`}>
                      {(lf) => (
                        <div className="flex-1">
                          <Combobox
                            value={lf.state.value || null}
                            onValueChange={(v) => lf.handleChange(v ?? '')}
                            itemToStringLabel={(id) => {
                              const l = labels.find((x) => x.id === id)
                              return l ? l.name : String(id ?? '')
                            }}
                          >
                            <ComboboxInput placeholder="Label" />
                            <ComboboxContent>
                              <ComboboxList>
                                {labels.map((l) => (
                                  <ComboboxItem key={l.id} value={l.id}>
                                    {l.name}
                                  </ComboboxItem>
                                ))}
                                <ComboboxEmpty>No labels. Add one above.</ComboboxEmpty>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </div>
                      )}
                    </form.Field>
                    <form.Field name={`productionCosts[${i}].amount`}>
                      {(af) => (
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Amount"
                          value={af.state.value ?? ''}
                          onChange={(e) => af.handleChange(e.target.value)}
                          className="w-28"
                        />
                      )}
                    </form.Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => field.handleChange(rows.filter((_, idx) => idx !== i))}
                      aria-label="Remove"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    field.pushValue({
                      labelId: labels[0]?.id ?? '',
                      amount: '0',
                    })
                  }}
                >
                  <PlusIcon className="size-4" />
                  Add
                </Button>
              </div>
            )
          }}
        </form.Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? '…' : isEdit ? 'Update' : 'Create'}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        {isEdit && existing && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateMut.mutate({
                data: { id: productId!, archivedAt: !existing.product.archivedAt },
              })
            }
            disabled={updateMut.isPending}
            className="gap-2"
          >
            <ArchiveIcon className="size-4" />
            {existing.product.archivedAt ? 'Unarchive' : 'Archive'}
          </Button>
        )}
      </div>
    </form>
  )
}

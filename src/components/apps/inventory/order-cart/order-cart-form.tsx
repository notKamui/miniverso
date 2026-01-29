import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormInput } from '@/components/form/form-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { orderCartSubmitSchema } from '@/lib/forms/order-cart'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import {
  $createOrderPriceModificationPreset,
  getOrderPriceModificationPresetsQueryOptions,
  orderPriceModificationPresetsQueryKey,
} from '@/server/functions/inventory/order-price-modification-presets'
import { getOrderReferencePrefixesQueryOptions } from '@/server/functions/inventory/order-reference-prefixes'
import { $createOrder, ordersQueryKey } from '@/server/functions/inventory/orders'
import { productsQueryKey } from '@/server/functions/inventory/products'
import { inventoryStockStatsQueryKey } from '@/server/functions/inventory/stats'
import { PrefixCombobox } from './comboboxes'
import { NextReference } from './next-reference'
import { OrderCartAddProductSection } from './order-cart-add-product-section'
import { OrderCartItemsList } from './order-cart-items-list'
import { OrderCartPriceModificationSection } from './order-cart-price-modification-section'
import { OrderCartSavePresetDialog } from './order-cart-save-preset-dialog'
import { CartItem, PriceModification, Preset, defaultValues } from './types'
import { applyModificationToPrice, presetToModification } from './utils'

export function OrderCartForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  const { data: presets = [] } = useQuery(getOrderPriceModificationPresetsQueryOptions())

  const [modification, setModification] = useState<PriceModification>({
    type: 'decrease',
    kind: 'relative',
    value: 0,
  })
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [savePresetName, setSavePresetName] = useState('')

  const createPresetMut = useMutation({
    mutationFn: $createOrderPriceModificationPreset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderPriceModificationPresetsQueryKey })
      setSavePresetOpen(false)
      setSavePresetName('')
      toast.success('Preset saved')
    },
  })

  const createMut = useMutation({
    mutationFn: $createOrder,
    onSuccess: async (newOrder) => {
      const invalidations = [queryClient.invalidateQueries({ queryKey: ordersQueryKey })]
      if (newOrder.status === 'paid') {
        invalidations.push(queryClient.invalidateQueries({ queryKey: productsQueryKey }))
        invalidations.push(queryClient.invalidateQueries({ queryKey: inventoryStockStatsQueryKey }))
      }
      await Promise.all(invalidations)
      toast.success('Order created')
      await navigate({ to: '/inventory/orders' })
    },
  })

  const form = useForm({
    defaultValues,
    onSubmitMeta: { status: 'prepared' as 'prepared' | 'paid' },
    onSubmit: async ({ value, meta: { status } }) => {
      const parsed = orderCartSubmitSchema.safeParse({
        prefixId: value.prefix?.id,
        description: value.description.trim() || undefined,
        items: value.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPriceTaxFree: i.unitPriceTaxFree ?? undefined,
        })),
      })

      if (!parsed.success) {
        const first = parsed.error.issues[0]?.message
        toast.error(typeof first === 'string' ? first : 'Invalid form')
        return
      }

      createMut.mutate({
        data: { ...parsed.data, status },
      })
    },
  })

  function addItem() {
    const p = form.state.values.addProduct
    if (!p) return
    const addQty = form.state.values.addQty
    const q = Math.max(1, Math.floor(Number.parseFloat(addQty) || 1))
    const items = form.state.values.items
    const existing = items.find((i: CartItem) => i.productId === p.id)
    const newItems = existing
      ? items.map((i: CartItem) => (i.productId === p.id ? { ...i, quantity: i.quantity + q } : i))
      : [
          ...items,
          {
            productId: p.id,
            quantity: q,
            name: p.name,
            priceTaxFree: Number(p.priceTaxFree),
            vatPercent: Number(p.vatPercent),
          },
        ]
    form.setFieldValue('items', newItems)
    form.setFieldValue('addProduct', null)
    form.setFieldValue('addQty', '1')
    form.setFieldValue('productSearch', '')
  }

  function applyModification() {
    const items = form.state.values.items
    if (items.length === 0) return
    const newItems = items.map((i) => ({
      ...i,
      unitPriceTaxFree: applyModificationToPrice(i.priceTaxFree, modification),
    }))
    form.setFieldValue('items', newItems)
  }

  function clearModification() {
    const items = form.state.values.items
    const newItems = items.map(({ unitPriceTaxFree: _, ...rest }) => rest)
    form.setFieldValue('items', newItems)
    setSelectedPreset(null)
  }

  function handleApplyPreset(preset: Preset | null) {
    if (!preset) return
    setSelectedPreset(preset)
    setModification(presetToModification(preset))
    const items = form.state.values.items
    if (items.length > 0) {
      const mod = presetToModification(preset)
      const newItems = items.map((i) => ({
        ...i,
        unitPriceTaxFree: applyModificationToPrice(i.priceTaxFree, mod),
      }))
      form.setFieldValue('items', newItems)
    }
  }

  function handleSavePreset(data: {
    name: string
    type: PriceModification['type']
    kind: PriceModification['kind']
    value: number
  }) {
    createPresetMut.mutate({ data })
  }

  const hasPrefixes = prefixes.length > 0

  if (!hasPrefixes) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Add at least one order reference prefix in Settings to create orders.
        </p>
        <Button asChild variant="outline">
          <Link to="/inventory/settings">Inventory Settings</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex max-w-2xl flex-col gap-6"
      onKeyDown={(e) => {
        if (
          e.key === 'Enter' &&
          (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault()
        }
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Reference prefix</Label>
          <form.Field name="prefix">
            {(field) => (
              <>
                <PrefixCombobox.Root
                  items={prefixes}
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  itemToStringLabel={(p) => p.prefix}
                >
                  <PrefixCombobox.Input placeholder="Select prefix" />
                  <PrefixCombobox.Content>
                    <PrefixCombobox.List>
                      {(p) => (
                        <PrefixCombobox.Item key={p.id} value={p}>
                          {p.prefix}
                        </PrefixCombobox.Item>
                      )}
                    </PrefixCombobox.List>
                    <PrefixCombobox.Empty>No prefixes. Add one in Settings.</PrefixCombobox.Empty>
                  </PrefixCombobox.Content>
                </PrefixCombobox.Root>
                <form.Subscribe selector={(s) => s.values.prefix}>
                  {(prefix) => (prefix?.id ? <NextReference prefixId={prefix.id} /> : null)}
                </form.Subscribe>
              </>
            )}
          </form.Field>
        </div>
        <FormInput form={form} name="description" label="Description (optional)" />
      </div>

      <form.Subscribe selector={(s) => s.values.productSearch ?? ''}>
        {(productSearch) => (
          <OrderCartAddProductSection
            form={form}
            productSearch={productSearch}
            onAddItem={addItem}
            onProductSearchChange={(v) => form.setFieldValue('productSearch', v)}
          />
        )}
      </form.Subscribe>

      <OrderCartItemsList form={form} currency={currency} />

      <form.Subscribe selector={(s) => s.values.items}>
        {(items) => {
          const list = items ?? []
          return (
            <>
              <OrderCartPriceModificationSection
                presets={presets}
                modification={modification}
                setModification={setModification}
                selectedPreset={selectedPreset}
                onApplyPreset={handleApplyPreset}
                onApplyModification={applyModification}
                onClearModification={clearModification}
                onSavePresetClick={() => setSavePresetOpen(true)}
                list={list}
                currency={currency}
              />
            </>
          )
        }}
      </form.Subscribe>

      <OrderCartSavePresetDialog
        open={savePresetOpen}
        onOpenChange={setSavePresetOpen}
        name={savePresetName}
        onNameChange={setSavePresetName}
        modification={modification}
        onSave={handleSavePreset}
        isPending={createPresetMut.isPending}
      />

      <form.Subscribe
        selector={(s) => ({
          items: s.values.items,
          prefix: s.values.prefix,
        })}
      >
        {({ items, prefix }) => {
          const canCreate = items && items.length > 0 && prefix
          return (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => form.handleSubmit({ status: 'prepared' })}
                disabled={createMut.isPending || !canCreate}
              >
                Create as prepared
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => form.handleSubmit({ status: 'paid' })}
                disabled={createMut.isPending || !canCreate}
              >
                Create and mark paid
              </Button>
            </div>
          )
        }}
      </form.Subscribe>
    </form>
  )
}

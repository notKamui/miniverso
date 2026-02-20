import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormInput } from '@/components/form/form-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { orderCartSubmitSchema } from '@/lib/forms/order-cart'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import {
  $createOrderPriceModificationPreset,
  getOrderPriceModificationPresetsQueryOptions,
  orderPriceModificationPresetsQueryKey,
} from '@/server/functions/inventory/order-price-modification-presets'
import { getOrderReferencePrefixesQueryOptions } from '@/server/functions/inventory/order-reference-prefixes'
import { $createOrder } from '@/server/functions/inventory/orders-mutations'
import { ordersQueryKey } from '@/server/functions/inventory/orders-queries'
import { productsQueryKey } from '@/server/functions/inventory/products'
import { inventoryStockStatsQueryKey } from '@/server/functions/inventory/stats-stock'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'
import { PrefixCombobox } from './comboboxes'
import { NextReference } from './next-reference'
import { OrderCartAddProductSection } from './order-cart-add-product-section'
import { OrderCartItemsList } from './order-cart-items-list'
import { OrderCartSavePresetDialog } from './order-cart-save-preset-dialog'
import { CartItem, defaultValues } from './types'
import { effectivePriceTaxFree } from './utils'

export function OrderCartForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())
  const { data: presets = [] } = useQuery(getOrderPriceModificationPresetsQueryOptions())

  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [savePresetName, setSavePresetName] = useState('')
  const [savePresetModification, setSavePresetModification] = useState<{
    type: 'increase' | 'decrease'
    kind: 'flat' | 'relative'
    value: number
  } | null>(null)

  const createPresetMut = useMutation({
    mutationFn: $createOrderPriceModificationPreset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderPriceModificationPresetsQueryKey })
      setSavePresetOpen(false)
      setSavePresetName('')
      setSavePresetModification(null)
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
        items: value.items.map((i) => {
          const effective = effectivePriceTaxFree(i)
          return {
            productId: i.productId,
            quantity: i.quantity,
            unitPriceTaxFree: effective !== i.priceTaxFree ? effective : undefined,
            modifications: i.modifications?.length ? i.modifications : undefined,
          }
        }),
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
      ? items.map((i: CartItem) =>
          i.productId === p.id
            ? { ...i, quantity: i.quantity + q, modifications: i.modifications ?? [] }
            : i,
        )
      : [
          ...items,
          {
            productId: p.id,
            quantity: q,
            name: p.name,
            priceTaxFree: Number(p.priceTaxFree),
            vatPercent: Number(p.vatPercent),
            modifications: [],
          },
        ]
    form.setFieldValue('items', newItems)
    form.setFieldValue('addProduct', null)
    form.setFieldValue('addQty', '1')
    form.setFieldValue('productSearch', '')
  }

  function handleSavePreset(data: {
    name: string
    type: 'increase' | 'decrease'
    kind: 'flat' | 'relative'
    value: number
  }) {
    createPresetMut.mutate({ data })
  }

  function openSavePresetDialog(mod: {
    type: 'increase' | 'decrease'
    kind: 'flat' | 'relative'
    value: number
  }) {
    setSavePresetModification(mod)
    setSavePresetOpen(true)
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

      <OrderCartItemsList
        form={form}
        currency={currency}
        presets={presets}
        onSavePresetClick={openSavePresetDialog}
      />

      <form.Subscribe selector={(s) => s.values.items}>
        {(items) => {
          const list = items ?? []
          const totalTaxFree = list.reduce((s, i) => {
            const a = s + effectivePriceTaxFree(i) * i.quantity
            return a
          }, 0)
          const totalTaxIncluded = list.reduce(
            (s, i) => s + priceTaxIncluded(effectivePriceTaxFree(i), i.vatPercent) * i.quantity,
            0,
          )
          return list.length > 0 ? (
            <div className="text-sm">
              <p>
                <strong>Total (ex. tax):</strong> {formatMoney(totalTaxFree, currency)}
              </p>
              <p>
                <strong>Total (incl. tax):</strong> {formatMoney(totalTaxIncluded, currency)}
              </p>
            </div>
          ) : null
        }}
      </form.Subscribe>

      <OrderCartSavePresetDialog
        open={savePresetOpen}
        onOpenChange={(open) => {
          setSavePresetOpen(open)
          if (!open) setSavePresetModification(null)
        }}
        name={savePresetName}
        onNameChange={setSavePresetName}
        modification={savePresetModification ?? { type: 'decrease', kind: 'relative', value: 0 }}
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

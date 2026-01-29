import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { DataFromQueryOptions, ReactForm } from '@/lib/utils/types'
import { FormInput } from '@/components/form/form-input'
import { Button } from '@/components/ui/button'
import { createCombobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { orderCartSubmitSchema } from '@/lib/forms/order-cart'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
import {
  $createOrderPriceModificationPreset,
  getOrderPriceModificationPresetsQueryOptions,
  orderPriceModificationPresetsQueryKey,
} from '@/server/functions/inventory/order-price-modification-presets'
import {
  $getNextOrderReference,
  getOrderReferencePrefixesQueryOptions,
} from '@/server/functions/inventory/order-reference-prefixes'
import { $createOrder, ordersQueryKey } from '@/server/functions/inventory/orders'
import { getProductsQueryOptions, productsQueryKey } from '@/server/functions/inventory/products'
import { inventoryStockStatsQueryKey } from '@/server/functions/inventory/stats'
import { priceTaxIncluded } from '@/server/functions/inventory/utils'

type CartItem = {
  productId: string
  quantity: number
  name: string
  priceTaxFree: number
  vatPercent: number
  unitPriceTaxFree?: number
}

type PriceModification = {
  type: 'increase' | 'decrease'
  kind: 'flat' | 'relative'
  value: number
}

function effectivePriceTaxFree(item: CartItem): number {
  return item.unitPriceTaxFree ?? item.priceTaxFree
}

function applyModificationToPrice(basePrice: number, mod: PriceModification): number {
  const v = mod.value
  let result: number
  if (mod.type === 'increase') {
    result = mod.kind === 'flat' ? basePrice + v : basePrice * (1 + v / 100)
  } else {
    result = mod.kind === 'flat' ? Math.max(0, basePrice - v) : basePrice * (1 - v / 100)
    result = Math.max(0, result)
  }
  return Number(result.toFixed(2))
}

type Prefix = DataFromQueryOptions<ReturnType<typeof getOrderReferencePrefixesQueryOptions>>[number]
type Product = DataFromQueryOptions<ReturnType<typeof getProductsQueryOptions>>['items'][number]
type Preset = DataFromQueryOptions<
  ReturnType<typeof getOrderPriceModificationPresetsQueryOptions>
>[number]

type OrderCartFormValues = {
  prefix: Prefix | null
  description: string
  items: CartItem[]
  addProduct: Product | null
  addQty: string
  productSearch: string
}

const defaultValues: OrderCartFormValues = {
  prefix: null,
  description: '',
  items: [],
  addProduct: null,
  addQty: '1',
  productSearch: '',
}

const PrefixCombobox = createCombobox<Prefix>()
const ProductCombobox = createCombobox<Product>()
const PresetCombobox = createCombobox<Preset>()

function OrderCartAddProductSection({
  form,
  productSearch,
  onAddItem,
  onProductSearchChange,
}: {
  form: ReactForm<OrderCartFormValues>
  productSearch: string
  onAddItem: () => void
  onProductSearchChange: (value: string) => void
}) {
  const debouncedSearch = useDebounce(productSearch, 300)
  const productSearchParams = {
    page: 1,
    size: 50,
    archived: 'active' as const,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
  }
  const { data: productsPage, isFetching: productsLoading } = useQuery(
    getProductsQueryOptions(productSearchParams),
  )
  const products = productsPage?.items ?? []

  return (
    <div className="space-y-2">
      <Label>Add product</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <form.Field name="addProduct">
            {(addProductField) => (
              <form.Field name="productSearch">
                {() => (
                  <ProductCombobox.Root
                    items={
                      addProductField.state.value &&
                      !products.some((p) => p.id === addProductField.state.value?.id)
                        ? [addProductField.state.value, ...products]
                        : products
                    }
                    value={addProductField.state.value}
                    onValueChange={(v) => addProductField.handleChange(v)}
                    onInputValueChange={onProductSearchChange}
                    itemToStringLabel={(p) =>
                      p
                        ? p.kind === 'bundle'
                          ? `${p.name} (${p.sku ?? '—'}) · bundle`
                          : `${p.name} (${p.sku ?? '—'}) · stock: ${p.quantity}`
                        : ''
                    }
                  >
                    <ProductCombobox.Input placeholder="Search by name or SKU…" />
                    <ProductCombobox.Content>
                      <ProductCombobox.List>
                        {(p) => (
                          <ProductCombobox.Item key={p.id} value={p}>
                            {p.kind === 'bundle'
                              ? `${p.name} (${p.sku ?? '—'}) · bundle`
                              : `${p.name} (${p.sku ?? '—'}) · stock: ${p.quantity}`}
                          </ProductCombobox.Item>
                        )}
                      </ProductCombobox.List>
                      <ProductCombobox.Empty>
                        {productsLoading ? 'Searching…' : 'No products. Try another search.'}
                      </ProductCombobox.Empty>
                    </ProductCombobox.Content>
                  </ProductCombobox.Root>
                )}
              </form.Field>
            )}
          </form.Field>
        </div>
        <form.Field name="addQty">
          {(field) => (
            <Input
              type="number"
              min={1}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="w-24"
            />
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.addProduct}>
          {(addProduct) => (
            <Button type="button" onClick={onAddItem} disabled={!addProduct}>
              <PlusIcon className="size-4" />
            </Button>
          )}
        </form.Subscribe>
      </div>
    </div>
  )
}

function presetToModification(p: Preset): PriceModification {
  return {
    type: p.type,
    kind: p.kind,
    value: Number(p.value),
  }
}

function presetLabel(p: Preset): string {
  const v = Number(p.value)
  const suffix = p.kind === 'relative' ? `%` : ''
  const sign = p.type === 'increase' ? '+' : '−'
  return `${p.name} (${sign}${v}${suffix})`
}

export function OrderCart() {
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

  const createMut = useMutation({
    mutationFn: $createOrder,
    onSuccess: async (newOrder) => {
      let invalidations = [queryClient.invalidateQueries({ queryKey: ordersQueryKey })]
      if (newOrder.status === 'paid') {
        invalidations.push(queryClient.invalidateQueries({ queryKey: productsQueryKey }))
        invalidations.push(queryClient.invalidateQueries({ queryKey: inventoryStockStatsQueryKey }))
      }
      await Promise.all(invalidations)
      toast.success('Order created')
      await navigate({ to: '/inventory/orders' })
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

      <form.Field name="items">
        {(field) => {
          const items = field.state.value ?? []
          return (
            <div className="space-y-2">
              <Label>Items</Label>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items. Add products above.</p>
              ) : (
                <ul className="space-y-2 rounded-md border p-2">
                  {items.map((i) => (
                    <li
                      key={i.productId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {i.name} × {i.quantity} ={' '}
                        {formatMoney(
                          priceTaxIncluded(effectivePriceTaxFree(i), i.vatPercent) * i.quantity,
                          currency,
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          field.handleChange(items.filter((it) => it.productId !== i.productId))
                        }}
                        aria-label="Remove"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        }}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.items}>
        {(items) => {
          const list = items ?? []
          const totalTaxFree = list.reduce((s, i) => s + effectivePriceTaxFree(i) * i.quantity, 0)
          const totalTaxIncluded = list.reduce(
            (s, i) => s + priceTaxIncluded(effectivePriceTaxFree(i), i.vatPercent) * i.quantity,
            0,
          )
          const hasItems = list.length > 0
          return (
            <>
              {hasItems && (
                <div className="space-y-2">
                  <Label>Price modification</Label>
                  <div className="rounded-md border p-3">
                    <div className="grid grid-cols-[auto_auto_auto_auto_1fr] items-center gap-x-2 gap-y-1">
                      <Label className="text-xs text-muted-foreground">Preset</Label>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Label className="text-xs text-muted-foreground">Kind</Label>
                      <Label className="text-xs text-muted-foreground">Value</Label>
                      <div />
                      <PresetCombobox.Root
                        items={presets}
                        value={selectedPreset}
                        onValueChange={(p) => handleApplyPreset(p)}
                        itemToStringLabel={presetLabel}
                      >
                        <PresetCombobox.Input placeholder="Apply preset…" className="w-44" />
                        <PresetCombobox.Content>
                          <PresetCombobox.List>
                            {(p) => (
                              <PresetCombobox.Item key={p.id} value={p}>
                                {presetLabel(p)}
                              </PresetCombobox.Item>
                            )}
                          </PresetCombobox.List>
                          <PresetCombobox.Empty>No presets. Add in Settings.</PresetCombobox.Empty>
                        </PresetCombobox.Content>
                      </PresetCombobox.Root>
                      <Select
                        value={modification.type}
                        onValueChange={(v) =>
                          setModification((m) => ({ ...m, type: v as PriceModification['type'] }))
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increase">Increase</SelectItem>
                          <SelectItem value="decrease">Decrease</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={modification.kind}
                        onValueChange={(v) =>
                          setModification((m) => ({ ...m, kind: v as PriceModification['kind'] }))
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="relative">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step={modification.kind === 'relative' ? 1 : 0.01}
                        value={modification.value || ''}
                        onChange={(e) =>
                          setModification((m) => ({
                            ...m,
                            value: Number.parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-20"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={applyModification}
                          disabled={list.length === 0}
                        >
                          Apply
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearModification}
                          disabled={!list.some((i) => i.unitPriceTaxFree !== undefined)}
                        >
                          Clear
                        </Button>
                        {list.some((i) => i.unitPriceTaxFree !== undefined) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSavePresetOpen(true)}
                          >
                            Save as preset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {list.length > 0 ? (
                <div className="text-sm">
                  <p>
                    <strong>Total (ex. tax):</strong> {formatMoney(totalTaxFree, currency)}
                  </p>
                  <p>
                    <strong>Total (incl. tax):</strong> {formatMoney(totalTaxIncluded, currency)}
                  </p>
                </div>
              ) : null}
            </>
          )
        }}
      </form.Subscribe>

      <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as preset</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const name = savePresetName.trim()
              if (!name) return
              createPresetMut.mutate({
                data: {
                  name,
                  type: modification.type,
                  kind: modification.kind,
                  value: modification.value,
                },
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="e.g. Wholesale -15%"
                maxLength={200}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSavePresetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!savePresetName.trim() || createPresetMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

function NextReference({ prefixId }: { prefixId: string }) {
  const { data } = useQuery({
    queryKey: ['next-order-ref', prefixId],
    queryFn: () => $getNextOrderReference({ data: { prefixId } }),
  })
  return data ? <p className="text-xs text-muted-foreground">Next reference: {data}</p> : null
}

import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { DataFromQueryOptions, ReactForm } from '@/lib/utils/types'
import { FormInput } from '@/components/form/form-input'
import { Button } from '@/components/ui/button'
import { createCombobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { orderCartSubmitSchema } from '@/lib/forms/order-cart'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatMoney } from '@/lib/utils/format-money'
import { getInventoryCurrencyQueryOptions } from '@/server/functions/inventory/currency'
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
}

type Prefix = DataFromQueryOptions<ReturnType<typeof getOrderReferencePrefixesQueryOptions>>[number]
type Product = DataFromQueryOptions<ReturnType<typeof getProductsQueryOptions>>['items'][number]

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
                      p ? `${p.name} (${p.sku ?? '—'}) · stock: ${p.quantity}` : ''
                    }
                  >
                    <ProductCombobox.Input placeholder="Search by name or SKU…" />
                    <ProductCombobox.Content>
                      <ProductCombobox.List>
                        {(p) => (
                          <ProductCombobox.Item key={p.id} value={p}>
                            {p.name} ({p.sku ?? '—'}) · stock: {p.quantity}
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

export function OrderCart() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())
  const { data: currency = 'EUR' } = useSuspenseQuery(getInventoryCurrencyQueryOptions())

  const form = useForm({
    defaultValues,
    onSubmitMeta: { status: 'prepared' as 'prepared' | 'paid' },
    onSubmit: async ({ value, meta: { status } }) => {
      const parsed = orderCartSubmitSchema.safeParse({
        prefixId: value.prefix?.id,
        description: value.description.trim() || undefined,
        items: value.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
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
                          priceTaxIncluded(i.priceTaxFree, i.vatPercent) * i.quantity,
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
          const totalTaxFree = list.reduce((s, i) => s + i.priceTaxFree * i.quantity, 0)
          const totalTaxIncluded = list.reduce(
            (s, i) => s + priceTaxIncluded(i.priceTaxFree, i.vatPercent) * i.quantity,
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

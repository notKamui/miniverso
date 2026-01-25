import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/lib/hooks/use-debounce'
import {
  $createOrder,
  $getNextOrderReference,
  getOrderReferencePrefixesQueryOptions,
  getProductsQueryOptions,
  ordersQueryKey,
  priceTaxIncluded,
} from '@/server/functions/inventory'

type CartItem = {
  productId: string
  quantity: number
  name: string
  priceTaxFree: number
  vatPercent: number
}

export function OrderCart() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())
  type Prefix = (typeof prefixes)[number]
  const [prefix, setPrefix] = useState<Prefix | null>(null)
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<CartItem[]>([])
  const [addProduct, setAddProduct] = useState<{
    id: string
    name: string
    priceTaxFree: number
    vatPercent: number
    sku?: string | null
    quantity?: number
  } | null>(null)
  const [addQty, setAddQty] = useState('1')
  const [productSearch, setProductSearch] = useState('')
  const debouncedProductSearch = useDebounce(productSearch, 300)

  const productSearchParams = {
    page: 1,
    size: 50,
    archived: 'active' as const,
    ...(debouncedProductSearch.trim() && { search: debouncedProductSearch.trim() }),
  }
  const { data: productsPage, isFetching: productsLoading } = useQuery(
    getProductsQueryOptions(productSearchParams),
  )
  const products = productsPage?.items ?? []

  const { data: nextReference } = useQuery({
    queryKey: ['next-order-ref', prefix?.id],
    queryFn: () => $getNextOrderReference({ data: { prefixId: prefix!.id } }),
    enabled: Boolean(prefix?.id),
  })

  const createMut = useMutation({
    mutationFn: $createOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      toast.success('Order created')
      void navigate({ to: '/inventory/orders' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function addItem() {
    const p = addProduct
    if (!p) return
    const q = Math.max(1, Math.floor(Number.parseFloat(addQty) || 1))
    const existing = items.find((i) => i.productId === p.id)
    if (existing) {
      setItems((prev) =>
        prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + q } : i)),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: p.id,
          quantity: q,
          name: p.name,
          priceTaxFree: Number(p.priceTaxFree),
          vatPercent: Number(p.vatPercent),
        },
      ])
    }
    setAddProduct(null)
    setAddQty('1')
    setProductSearch('')
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const totalTaxFree = items.reduce((s, i) => s + i.priceTaxFree * i.quantity, 0)
  const totalTaxIncluded = items.reduce(
    (s, i) => s + priceTaxIncluded(i.priceTaxFree, i.vatPercent) * i.quantity,
    0,
  )

  const hasPrefixes = prefixes.length > 0
  const canCreate = hasPrefixes && items.length > 0 && prefix

  function handleSubmit(status: 'prepared' | 'paid') {
    if (!prefix) {
      toast.error('Select a reference prefix')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one product')
      return
    }
    createMut.mutate({
      data: {
        prefixId: prefix.id,
        description: description.trim() || undefined,
        status,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    })
  }

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
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Reference prefix</Label>
          <Combobox
            items={prefixes}
            value={prefix}
            onValueChange={(v) => setPrefix(v ?? null)}
            itemToStringLabel={(p) => p.prefix}
          >
            <ComboboxInput placeholder="Select prefix" />
            <ComboboxContent>
              <ComboboxList>
                {(p) => (
                  <ComboboxItem key={p.id} value={p}>
                    {p.prefix}
                  </ComboboxItem>
                )}
              </ComboboxList>
              <ComboboxEmpty>No prefixes. Add one in Settings.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
          {nextReference && (
            <p className="text-xs text-muted-foreground">Next reference: {nextReference}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Add product</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Combobox
              items={
                addProduct && !products.some((p) => p.id === addProduct.id)
                  ? [addProduct, ...products]
                  : products
              }
              value={addProduct}
              onValueChange={(v) => setAddProduct(v ?? null)}
              onInputValueChange={(v) => setProductSearch(v)}
              itemToStringLabel={(p) =>
                p ? `${p.name} (${p.sku ?? '—'}) · stock: ${p.quantity}` : ''
              }
            >
              <ComboboxInput placeholder="Search by name or SKU…" />
              <ComboboxContent>
                <ComboboxList>
                  {(p) => (
                    <ComboboxItem key={p.id} value={p}>
                      {p.name} ({p.sku ?? '—'}) · stock: {p.quantity}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>
                  {productsLoading ? 'Searching…' : 'No products. Try another search.'}
                </ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
          <Input
            type="number"
            min="1"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            className="w-24"
          />
          <Button type="button" onClick={addItem} disabled={!addProduct}>
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Items</Label>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items. Add products above.</p>
        ) : (
          <ul className="space-y-2 rounded-md border p-2">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {i.name} × {i.quantity} ={' '}
                  {(priceTaxIncluded(i.priceTaxFree, i.vatPercent) * i.quantity).toFixed(2)} €
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i.productId)}
                  aria-label="Remove"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="text-sm">
          <p>
            <strong>Total (ex. tax):</strong> {totalTaxFree.toFixed(2)} €
          </p>
          <p>
            <strong>Total (incl. tax):</strong> {totalTaxIncluded.toFixed(2)} €
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => handleSubmit('prepared')}
          disabled={createMut.isPending || !canCreate}
        >
          Create as prepared
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit('paid')}
          disabled={createMut.isPending || !canCreate}
        >
          Create and mark paid
        </Button>
      </div>
    </div>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  $createOrder,
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
  const { data: productsPage } = useQuery(
    getProductsQueryOptions({ page: 1, size: 100, archived: 'active' }),
  )
  const products = productsPage?.items ?? []
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<CartItem[]>([])
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState('1')

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
    const p = products.find((x) => x.id === addProductId)
    if (!p) return
    const q = Math.max(1, Math.floor(Number.parseFloat(addQty) || 1))
    const existing = items.find((i) => i.productId === addProductId)
    if (existing) {
      setItems((prev) =>
        prev.map((i) => (i.productId === addProductId ? { ...i, quantity: i.quantity + q } : i)),
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
    setAddProductId('')
    setAddQty('1')
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const totalTaxFree = items.reduce((s, i) => s + i.priceTaxFree * i.quantity, 0)
  const totalTaxIncluded = items.reduce(
    (s, i) => s + priceTaxIncluded(i.priceTaxFree, i.vatPercent) * i.quantity,
    0,
  )

  function handleSubmit(status: 'prepared' | 'paid') {
    if (!reference.trim()) {
      toast.error('Reference is required')
      return
    }
    if (items.length === 0) {
      toast.error('Add at least one product')
      return
    }
    createMut.mutate({
      data: {
        reference: reference.trim(),
        description: description.trim() || undefined,
        status,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. ORD-001"
            required
          />
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
          <Select value={addProductId} onValueChange={setAddProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} (stock: {p.quantity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            className="w-24"
          />
          <Button type="button" onClick={addItem} disabled={!addProductId}>
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
          disabled={createMut.isPending || items.length === 0}
        >
          Create as prepared
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit('paid')}
          disabled={createMut.isPending || items.length === 0}
        >
          Create and mark paid
        </Button>
      </div>
    </div>
  )
}

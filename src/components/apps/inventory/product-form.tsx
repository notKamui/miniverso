import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  $createInventoryTag,
  $createProduct,
  $createProductionCostLabel,
  $updateProduct,
  getInventoryTagsQueryOptions,
  getProductionCostLabelsQueryOptions,
  getProductQueryOptions,
  inventoryTagsQueryKey,
  priceTaxIncluded,
  productionCostLabelsQueryKey,
  productsQueryKey,
} from '@/server/functions/inventory'

type ProductFormProps = {
  productId?: string
  onSuccess?: () => void
}

export function ProductForm({ productId, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(productId)

  const { data: existing } = useQuery({
    ...getProductQueryOptions(productId!),
    enabled: isEdit,
  })
  const { data: tags = [] } = useQuery(getInventoryTagsQueryOptions())
  const { data: labels = [] } = useQuery(getProductionCostLabelsQueryOptions())

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sku, setSku] = useState('')
  const [priceTaxFree, setPriceTaxFree] = useState('')
  const [vatPercent, setVatPercent] = useState('20')
  const [quantity, setQuantity] = useState('0')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [productionCosts, setProductionCosts] = useState<{ labelId: string; amount: string }[]>([])
  const [initialized, setInitialized] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newLabelName, setNewLabelName] = useState('')

  useEffect(() => {
    if (isEdit && existing && !initialized) {
      setName(existing.product.name)
      setDescription(existing.product.description ?? '')
      setSku(existing.product.sku ?? '')
      setPriceTaxFree(String(existing.product.priceTaxFree))
      setVatPercent(String(existing.product.vatPercent))
      setQuantity(String(existing.product.quantity))
      setTagIds(existing.tags.map((t) => t.id))
      setProductionCosts(
        existing.productionCosts.map((c) => ({
          labelId: c.labelId,
          amount: String(c.amount),
        })),
      )
      setInitialized(true)
    }
  }, [isEdit, existing, initialized])

  const createMut = useMutation({
    mutationFn: $createProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKey })
      toast.success('Product created')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const createTagMut = useMutation({
    mutationFn: $createInventoryTag,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      setTagIds((prev) => [...prev, data.id])
      setNewTagName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const createLabelMut = useMutation({
    mutationFn: $createProductionCostLabel,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      setProductionCosts((prev) => [...prev, { labelId: data.id, amount: '0' }])
      setNewLabelName('')
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

  const priceExcl = Number.parseFloat(priceTaxFree) || 0
  const vat = Number.parseFloat(vatPercent) || 0
  const priceIncl = priceTaxIncluded(priceExcl, vat)

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  function addProductionCost() {
    const first = labels[0]?.id
    setProductionCosts((prev) => [...prev, { labelId: first ?? '', amount: '0' }])
  }

  function removeProductionCost(i: number) {
    setProductionCosts((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateProductionCost(i: number, field: 'labelId' | 'amount', value: string) {
    setProductionCosts((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      sku: sku.trim(),
      priceTaxFree: Number.parseFloat(priceTaxFree) || 0,
      vatPercent: Number.parseFloat(vatPercent) || 0,
      quantity: Math.max(0, Math.floor(Number.parseFloat(quantity) || 0)),
      tagIds,
      productionCosts: productionCosts
        .filter((r) => r.labelId)
        .map((r) => ({ labelId: r.labelId, amount: Number.parseFloat(r.amount) || 0 })),
    }
    if (isEdit) {
      updateMut.mutate({ data: { ...payload, id: productId! } })
    } else {
      createMut.mutate({ data: payload })
    }
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Product name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. SKU-001"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="priceTaxFree">Price (ex. tax) €</Label>
          <Input
            id="priceTaxFree"
            type="number"
            step="0.01"
            min="0"
            value={priceTaxFree}
            onChange={(e) => setPriceTaxFree(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vatPercent">VAT %</Label>
          <Input
            id="vatPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={vatPercent}
            onChange={(e) => setVatPercent(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Price (incl. tax) €</Label>
          <p className="flex h-9 items-center text-muted-foreground">{priceIncl.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity in stock</Label>
        <Input
          id="quantity"
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                tagIds.includes(t.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
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
            <Button type="button" variant="outline" size="sm" onClick={addProductionCost}>
              <PlusIcon className="size-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {productionCosts.map((row, i) => (
            <div key={i} className="flex gap-2">
              <Select
                value={row.labelId}
                onValueChange={(v) => updateProductionCost(i, 'labelId', v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) => updateProductionCost(i, 'amount', e.target.value)}
                className="w-28"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeProductionCost(i)}
                aria-label="Remove"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {isEdit ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

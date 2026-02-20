import { useQuery } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProductCombobox } from '@/components/apps/inventory/order-cart/comboboxes'
import type { Product } from '@/components/apps/inventory/order-cart/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductFormValues } from '@/lib/forms/product'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { ReactForm } from '@/lib/utils/types'
import {
  getProductQueryOptions,
  getProductsQueryOptions,
} from '@/server/functions/inventory/products'

type Props = {
  form: ReactForm<ProductFormValues>
  productId?: string
}

const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000' as const

function useResolvedProduct(
  productId: string | undefined,
  inListProducts: Product[],
  productOptions: Product[],
): Product | null {
  const inList = useMemo(
    () => (productId ? inListProducts.some((p) => p.id === productId) : true),
    [productId, inListProducts],
  )
  const { data } = useQuery({
    ...getProductQueryOptions(productId || PLACEHOLDER_UUID),
    enabled: Boolean(productId) && !inList,
  })
  if (!productId) return null
  const fromList =
    productOptions.find((p) => p.id === productId) ?? inListProducts.find((p) => p.id === productId)
  if (fromList) return fromList
  return (data?.product as Product) ?? null
}

function BundleItemRow({
  index,
  form,
  onRemove,
  productId,
  allProducts,
  productOptions,
  isFetching,
  openRowIndex,
  setOpenRowIndex,
  setSearchByRow,
}: {
  index: number
  form: ReactForm<ProductFormValues>
  onRemove: () => void
  productId: string
  allProducts: Product[]
  productOptions: Product[]
  isFetching: boolean
  openRowIndex: number | null
  setOpenRowIndex: (v: number | null) => void
  setSearchByRow: (fn: (prev: Record<number, string>) => Record<number, string>) => void
}) {
  const selected = useResolvedProduct(productId, allProducts, productOptions)
  const items =
    selected && !productOptions.some((p) => p.id === selected.id)
      ? [selected, ...productOptions]
      : productOptions
  const isOpen = openRowIndex === index

  return (
    <div className="flex gap-2">
      <form.Field name={`bundleItems[${index}].productId`}>
        {(pf) => (
          <div className="flex-1">
            <ProductCombobox.Root
              items={items}
              value={selected}
              onValueChange={(v) => pf.handleChange(v?.id ?? '')}
              onInputValueChange={(v) => {
                if (!isOpen) return
                setSearchByRow((prev) => ({ ...prev, [index]: v }))
              }}
              onOpenChange={(nextOpen) => {
                setOpenRowIndex(nextOpen ? index : null)
                if (!nextOpen) setSearchByRow((prev) => ({ ...prev, [index]: '' }))
              }}
              itemToStringLabel={(p) => (p ? `${p.name} (${p.sku ?? '—'})` : '')}
            >
              <ProductCombobox.Input placeholder="Product" />
              <ProductCombobox.Content>
                <ProductCombobox.List>
                  {(p) => (
                    <ProductCombobox.Item key={p.id} value={p}>
                      {p.name} ({p.sku ?? '—'})
                    </ProductCombobox.Item>
                  )}
                </ProductCombobox.List>
                <ProductCombobox.Empty>
                  {isFetching ? 'Searching…' : 'No simple products. Try another search.'}
                </ProductCombobox.Empty>
              </ProductCombobox.Content>
            </ProductCombobox.Root>
          </div>
        )}
      </form.Field>
      <form.Field name={`bundleItems[${index}].quantity`}>
        {(qf) => (
          <Input
            type="number"
            min={1}
            step={1}
            placeholder="Qty"
            value={qf.state.value ?? ''}
            onChange={(e) => qf.handleChange(e.target.value)}
            className="w-24"
          />
        )}
      </form.Field>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove">
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}

export function ProductFormBundleItems({ form, productId }: Props) {
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null)
  const [searchByRow, setSearchByRow] = useState<Record<number, string>>({})

  const activeSearch = openRowIndex !== null ? (searchByRow[openRowIndex] ?? '') : ''
  const debouncedSearch = useDebounce(activeSearch, 300)

  const productSearchParams = {
    page: 1,
    size: 25,
    archived: 'active' as const,
    orderBy: 'name' as const,
    order: 'asc' as const,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
  }

  const { data: productsPage, isFetching } = useQuery(getProductsQueryOptions(productSearchParams))
  const allProducts = productsPage?.items ?? []
  const productOptions = allProducts.filter(
    (p) => p.kind === 'simple' && (productId == null || p.id !== productId),
  )

  return (
    <div className="space-y-2">
      <Label>Bundle components</Label>
      <form.Field name="bundleItems" mode="array">
        {(field) => {
          const rows = field.state.value ?? []
          return (
            <div className="space-y-2">
              {rows.map((_, i) => (
                <BundleItemRow
                  key={i}
                  index={i}
                  form={form}
                  onRemove={() => field.handleChange(rows.filter((_, idx) => idx !== i))}
                  productId={rows[i]?.productId ?? ''}
                  allProducts={allProducts}
                  productOptions={productOptions}
                  isFetching={isFetching}
                  openRowIndex={openRowIndex}
                  setOpenRowIndex={setOpenRowIndex}
                  setSearchByRow={setSearchByRow}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  field.pushValue({
                    productId: '',
                    quantity: '1',
                  })
                }}
                disabled={false}
              >
                <PlusIcon className="size-4" />
                Add
              </Button>
            </div>
          )
        }}
      </form.Field>
    </div>
  )
}

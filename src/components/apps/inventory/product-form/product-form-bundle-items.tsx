import { useQuery } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import type { ProductFormValues } from '@/lib/forms/product'
import type { DataFromQueryOptions, ReactForm } from '@/lib/utils/types'
import { Button } from '@/components/ui/button'
import { createCombobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { getProductsQueryOptions } from '@/server/functions/inventory/products'

type ProductOption = DataFromQueryOptions<
  ReturnType<typeof getProductsQueryOptions>
>['items'][number]

type Props = {
  form: ReactForm<ProductFormValues>
  productId?: string
}

const ProductCombobox = createCombobox<ProductOption>()

export function ProductFormBundleItems({ form, productId }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const productSearchParams = {
    page: 1,
    size: 25,
    archived: 'active' as const,
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
                <div key={i} className="flex gap-2">
                  <form.Field name={`bundleItems[${i}].productId`}>
                    {(pf) => (
                      <div className="flex-1">
                        {(() => {
                          const selected =
                            productOptions.find((p) => p.id === pf.state.value) ??
                            allProducts.find((p) => p.id === pf.state.value) ??
                            null
                          const items =
                            selected && !productOptions.some((p) => p.id === selected.id)
                              ? [selected, ...productOptions]
                              : productOptions
                          return (
                            <ProductCombobox.Root
                              items={items}
                              value={selected}
                              onValueChange={(v) => pf.handleChange(v?.id ?? '')}
                              onInputValueChange={(v) => {
                                if (!open) return
                                setSearch(v)
                              }}
                              onOpenChange={(nextOpen) => {
                                setOpen(nextOpen)
                                if (!nextOpen) setSearch('')
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
                                  {isFetching
                                    ? 'Searching…'
                                    : 'No simple products. Try another search.'}
                                </ProductCombobox.Empty>
                              </ProductCombobox.Content>
                            </ProductCombobox.Root>
                          )
                        })()}
                      </div>
                    )}
                  </form.Field>
                  <form.Field name={`bundleItems[${i}].quantity`}>
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

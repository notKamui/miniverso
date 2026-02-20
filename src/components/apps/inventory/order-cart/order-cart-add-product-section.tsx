import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { ReactForm } from '@/lib/utils/types'
import { getProductsQueryOptions } from '@/server/functions/inventory/products'
import { ProductCombobox } from './comboboxes'
import type { OrderCartFormValues } from './types'

export function OrderCartAddProductSection({
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
    orderBy: 'name' as const,
    order: 'asc' as const,
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
        <form.Subscribe<null | {
          id: string
          name: string
          sku?: string | null
          kind: 'bundle' | 'simple'
          quantity: number
        }>
          selector={(s) => s.values.addProduct}
        >
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

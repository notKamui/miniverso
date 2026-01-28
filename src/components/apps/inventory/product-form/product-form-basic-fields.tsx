import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'
import { Label } from '@/components/ui/label'

type Props = { form: ReactForm<ProductFormValues> }

export function ProductFormBasicFields({ form }: Props) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput form={form} name="name" label="Name" required placeholder="Product name" />
        <FormInput form={form} name="sku" label="SKU" required placeholder="e.g. SKU-001" />
      </div>

      <TextInput
        form={form}
        name="description"
        label="Description"
        rows={2}
        placeholder="Optional"
      />

      <form.Field name="kind">
        {(field) => (
          <div className="space-y-2">
            <Label>Product type</Label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="simple"
                  checked={(field.state.value ?? 'simple') === 'simple'}
                  onChange={() => field.handleChange('simple')}
                  className="size-4"
                />
                <span className="text-sm">Simple product</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="bundle"
                  checked={field.state.value === 'bundle'}
                  onChange={() => field.handleChange('bundle')}
                  className="size-4"
                />
                <span className="text-sm">Bundle of products</span>
              </label>
            </div>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.kind}>
        {(kind) =>
          kind === 'simple' ? (
            <FormInput
              form={form}
              name="quantity"
              label="Quantity in stock"
              type="number"
              min={0}
              step={1}
              required
            />
          ) : null
        }
      </form.Subscribe>
    </>
  )
}

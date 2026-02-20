import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'

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
            <RadioGroup
              value={field.state.value ?? 'simple'}
              onValueChange={(v) => field.handleChange(v as 'simple' | 'bundle')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="simple" id="kind-simple" />
                <Label htmlFor="kind-simple" className="cursor-pointer font-normal">
                  Simple product
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bundle" id="kind-bundle" />
                <Label htmlFor="kind-bundle" className="cursor-pointer font-normal">
                  Bundle of products
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </form.Field>

      <form.Subscribe<'bundle' | 'simple' | undefined> selector={(s) => s.values.kind}>
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

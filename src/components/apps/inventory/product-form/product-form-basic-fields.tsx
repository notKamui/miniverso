import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'

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

      <FormInput
        form={form}
        name="quantity"
        label="Quantity in stock"
        type="number"
        min={0}
        step={1}
        required
      />
    </>
  )
}

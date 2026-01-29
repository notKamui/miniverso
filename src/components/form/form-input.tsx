import type { ComponentProps } from 'react'
import type { ReactForm } from '@/lib/utils/types'
import { FieldInfo } from '@/components/form/field-info'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const inputControlledKeys = ['type', 'value', 'onChange', 'onBlur', 'name', 'id', 'form'] as const

export type FormInputProps<F extends Record<string, any>> = {
  type?: React.HTMLInputTypeAttribute
  form: ReactForm<F>
  name: keyof F
  label: string
} & Omit<ComponentProps<'input'>, (typeof inputControlledKeys)[number]>

export function FormInput<F extends Record<string, any>>({
  type = 'text',
  name,
  form,
  label,
  ...inputProps
}: FormInputProps<F>) {
  return (
    <form.Field name={name as any}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Input
            type={type}
            id={field.name}
            name={field.name}
            value={field.state.value as any}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value as any)}
            {...inputProps}
          />
          <FieldInfo field={field} />
        </div>
      )}
    </form.Field>
  )
}

import type { ReactFormApi } from '@tanstack/react-form'
import { FieldInfo } from '@/components/form/field-info'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface FormInputProps<F extends Record<string, any>> {
  type: React.HTMLInputTypeAttribute
  form: ReactFormApi<F, any, any, any, any, any, any, any, any, any>
  name: keyof F
  label: string
}

export function FormInput<F extends Record<string, any>>({
  type = 'text',
  name,
  form,
  label,
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
          />
          <FieldInfo field={field} />
        </div>
      )}
    </form.Field>
  )
}

import { FieldInfo } from '@/components/form/field-info'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ReactFormApi } from '@tanstack/react-form'
import type { ComponentProps } from 'react'

export type TextInputProps<F extends Record<string, any>> = Omit<
  ComponentProps<typeof Textarea>,
  'form'
> & {
  form: ReactFormApi<F, any, any, any, any, any, any, any, any, any>
  name: keyof F
  label: string
}

export function TextInput<F extends Record<string, any>>({
  name,
  form,
  label,
  ...props
}: TextInputProps<F>) {
  return (
    <form.Field name={name as any}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Textarea
            id={field.name}
            name={field.name}
            value={field.state.value as any}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value as any)}
            {...props}
          />
          <FieldInfo field={field} />
        </div>
      )}
    </form.Field>
  )
}

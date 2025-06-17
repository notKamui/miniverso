import { FieldInfo } from '@/components/form/field-info'
import { CalendarSelect } from '@/components/ui/calendar-select'
import { Label } from '@radix-ui/react-label'
import type { ReactFormApi } from '@tanstack/react-form'

export interface DateInputProps<F extends Record<string, any>> {
  form: ReactFormApi<F, any, any, any, any, any, any, any, any, any>
  name: keyof F
  label: string
}

export function DateInput<F extends Record<string, any>>({
  name,
  form,
  label,
}: DateInputProps<F>) {
  return (
    <form.Field name={name as any}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <CalendarSelect
            value={field.state.value as any}
            onBlur={field.handleBlur}
            onChange={(date) => field.handleChange(date as any)}
            ariaHidden
          />
          <FieldInfo field={field} />
        </div>
      )}
    </form.Field>
  )
}

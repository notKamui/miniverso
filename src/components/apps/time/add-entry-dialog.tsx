import { useForm } from '@tanstack/react-form'
import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'
import { Button } from '@/components/ui/button'
import { CalendarSelect } from '@/components/ui/calendar-select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AddTimeEntrySchema } from '@/lib/forms/time-entry'
import { Time, UTCTime } from '@/lib/utils/time'
import { $createTimeEntry } from '@/server/functions/time-entry'

type AddEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Time
  tzOffset: number
  onSuccess?: () => void
}

export function AddEntryDialog({
  open,
  onOpenChange,
  defaultDate,
  tzOffset,
  onSuccess,
}: AddEntryDialogProps) {
  const form = useForm({
    validators: {
      onBlur: AddTimeEntrySchema,
    },
    defaultValues: {
      date: defaultDate.getDate(),
      startedAt: '',
      endedAt: '' as string | undefined,
      description: '',
    },
    onSubmit: async ({ value: data }) => {
      const dayKey = Time.from(data.date).formatDayKey()
      const startedAt = UTCTime.at(dayKey, data.startedAt, tzOffset)
      const endedAt =
        data.endedAt && data.endedAt.trim()
          ? UTCTime.at(dayKey, data.endedAt.trim(), tzOffset)
          : null
      await $createTimeEntry({
        data: {
          startedAt,
          endedAt,
          description: data.description.trim() || undefined,
        },
      })
      onSuccess?.()
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            event.stopPropagation()
            await form.handleSubmit()
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Add entry</DialogTitle>
            <DialogDescription className="sr-only">Add a time entry for any day</DialogDescription>
          </DialogHeader>

          <form.Field name="date">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm leading-none font-medium">
                  Date
                </Label>
                <CalendarSelect
                  value={field.state.value}
                  onChange={(date) => field.handleChange(date ?? new Date())}
                />
              </div>
            )}
          </form.Field>

          <FormInput type="time" form={form} name="startedAt" label="Started at" />
          <FormInput type="time" form={form} name="endedAt" label="Ended at (optional)" />
          <TextInput
            form={form}
            name="description"
            label="Description"
            className="max-h-60 min-h-60 resize-none wrap-break-word break-all"
          />

          <DialogFooter className="max-sm:flex max-sm:flex-row max-sm:gap-4">
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button type="submit" disabled={!canSubmit} className="max-sm:grow">
                  Add
                </Button>
              )}
            </form.Subscribe>
            <DialogClose asChild>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="max-sm:grow"
                variant="outline"
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

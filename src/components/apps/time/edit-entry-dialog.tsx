import { useForm } from '@tanstack/react-form'
import { FormInput } from '@/components/form/form-input'
import { TextInput } from '@/components/form/text-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EditTimeEntrySchema } from '@/lib/forms/time-entry'
import { Time } from '@/lib/utils/time'
import type { PartialExcept } from '@/lib/utils/types'
import type { TimeEntry } from '@/server/db/schema'

export function EditEntryDialog({
  entry,
  onEdit,
  onClose,
  ref,
}: {
  entry: TimeEntry | null
  onEdit: (entry: PartialExcept<TimeEntry, 'id'>) => Promise<void>
  onClose?: () => void
  ref?: React.RefObject<HTMLDivElement>
}) {
  const defaultStartedAt = entry?.startedAt
    ? Time.from(entry.startedAt).formatTime({ short: true })
    : undefined
  const defaultEndedAt = entry?.endedAt
    ? Time.from(entry.endedAt).formatTime({ short: true })
    : undefined
  const defaultDescription = entry?.description ?? ''

  const form = useForm({
    validators: {
      onBlur: EditTimeEntrySchema,
    },
    defaultValues: {
      startedAt: defaultStartedAt,
      endedAt: defaultEndedAt,
      description: defaultDescription,
    },
    onSubmit: async ({ value: data }) => {
      if (!entry) return
      const newStartedAt = data.startedAt
        ? Time.from(entry.startedAt).setTime(data.startedAt)
        : undefined
      const newEndedAt = data.endedAt
        ? Time.from(entry.endedAt).setTime(data.endedAt)
        : undefined

      await onEdit({
        id: entry.id,
        startedAt: newStartedAt?.getDate(),
        endedAt: newEndedAt?.getDate(),
        description: data.description,
      })
      onClose?.()
    },
  })

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent ref={ref}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
            <DialogDescription className="sr-only">
              Edit time entry dialog
            </DialogDescription>
          </DialogHeader>

          <FormInput
            type="time"
            form={form}
            name="startedAt"
            label="Started at"
          />

          <FormInput type="time" form={form} name="endedAt" label="Ended at" />

          <TextInput
            form={form}
            name="description"
            label="Description"
            className="max-h-60 min-h-60 resize-none break-words break-all"
          />

          <DialogFooter className="max-sm:flex max-sm:flex-row max-sm:gap-4">
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="max-sm:grow"
                >
                  Save
                </Button>
              )}
            </form.Subscribe>
            <DialogClose asChild>
              <Button
                type="button"
                onClick={onClose}
                className="max-sm:grow"
                variant="destructive"
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

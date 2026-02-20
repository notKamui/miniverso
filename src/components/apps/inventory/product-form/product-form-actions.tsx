import { ArchiveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductFormValues } from '@/lib/forms/product'
import type { ReactForm } from '@/lib/utils/types'
import { ProductFormExisting } from '.'

type UpdateMutation = {
  mutate: (opts: { data: { id: string; archivedAt?: boolean } }) => void
  isPending: boolean
}

type Props = {
  form: ReactForm<ProductFormValues>
  isEdit: boolean
  existing?: ProductFormExisting
  productId: string | undefined
  updateMut: UpdateMutation
  onSuccess?: () => void
}

export function ProductFormActions({
  form,
  isEdit,
  existing,
  productId,
  updateMut,
  onSuccess,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <form.Subscribe<[boolean, boolean]> selector={(s) => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? '…' : isEdit ? 'Update' : 'Create'}
          </Button>
        )}
      </form.Subscribe>
      <Button type="button" variant="outline" onClick={onSuccess}>
        Cancel
      </Button>
      {isEdit && existing && productId && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateMut.mutate({
              data: { id: productId, archivedAt: !existing.product.archivedAt },
            })
          }
          disabled={updateMut.isPending}
          className="gap-2"
        >
          <ArchiveIcon className="size-4" />
          {existing.product.archivedAt ? 'Unarchive' : 'Archive'}
        </Button>
      )}
    </div>
  )
}

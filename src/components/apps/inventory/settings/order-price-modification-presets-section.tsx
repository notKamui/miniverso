import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  $createOrderPriceModificationPreset,
  $deleteOrderPriceModificationPreset,
  $updateOrderPriceModificationPreset,
  getOrderPriceModificationPresetsQueryOptions,
  orderPriceModificationPresetsQueryKey,
} from '@/server/functions/inventory/order-price-modification-presets'
import { Section } from '../section'

type PresetForm = {
  name: string
  type: 'increase' | 'decrease'
  kind: 'flat' | 'relative'
  value: string
}

const defaultForm: PresetForm = {
  name: '',
  type: 'decrease',
  kind: 'relative',
  value: '',
}

function formatPresetValue(p: { type: string; kind: string; value: string }): string {
  const v = Number(p.value)
  const suffix = p.kind === 'relative' ? '%' : ''
  const sign = p.type === 'increase' ? '+' : '−'
  return `${sign}${v}${suffix}`
}

export function OrderPriceModificationPresetsSection() {
  const queryClient = useQueryClient()
  const { data: presets = [] } = useSuspenseQuery(getOrderPriceModificationPresetsQueryOptions())

  const [newPreset, setNewPreset] = useState<PresetForm>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PresetForm>(defaultForm)

  const createMut = useMutation({
    mutationFn: $createOrderPriceModificationPreset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderPriceModificationPresetsQueryKey })
      setNewPreset(defaultForm)
      toast.success('Preset added')
    },
  })

  const updateMut = useMutation({
    mutationFn: $updateOrderPriceModificationPreset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderPriceModificationPresetsQueryKey })
      setEditingId(null)
      toast.success('Preset updated')
    },
  })

  const deleteMut = useMutation({
    mutationFn: $deleteOrderPriceModificationPreset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderPriceModificationPresetsQueryKey })
      toast.success('Preset deleted')
    },
  })

  const editing = editingId ? presets.find((p) => p.id === editingId) : null

  function openEdit(p: (typeof presets)[0]) {
    setEditingId(p.id)
    setEditForm({
      name: p.name,
      type: p.type,
      kind: p.kind,
      value: String(p.value),
    })
  }

  function handleCreate(e: React.SubmitEvent) {
    e.preventDefault()
    const name = newPreset.name.trim()
    const value = Number.parseFloat(newPreset.value)
    if (!name || Number.isNaN(value) || value <= 0) return
    createMut.mutate({
      data: { name, type: newPreset.type, kind: newPreset.kind, value },
    })
  }

  function handleUpdate(e: React.SubmitEvent) {
    e.preventDefault()
    if (!editingId) return
    const name = editForm.name.trim()
    const value = Number.parseFloat(editForm.value)
    if (!name || Number.isNaN(value) || value <= 0) return
    updateMut.mutate({
      data: {
        id: editingId,
        name,
        type: editForm.type,
        kind: editForm.kind,
        value,
      },
    })
  }

  return (
    <Section
      title="Price modification presets"
      description={
        <>
          Presets you can apply when creating an order to adjust all line prices (e.g. Wholesale
          −15%, Event +5€). Manage presets here; apply them on the new order page.
        </>
      }
    >
      <form onSubmit={handleCreate}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:grid-rows-[auto_auto] md:items-center md:gap-x-2 md:gap-y-1">
          <div className="space-y-1.5 md:space-y-0 md:row-span-2 md:grid md:grid-cols-1 md:grid-rows-2 md:items-center">
            <Label htmlFor="new-preset-name">Name</Label>
            <Input
              id="new-preset-name"
              value={newPreset.name}
              onChange={(e) => setNewPreset((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Wholesale -15%"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5 md:space-y-0 md:row-span-2 md:grid md:grid-cols-1 md:grid-rows-2 md:items-center">
            <Label htmlFor="new-preset-type">Type</Label>
            <Select
              name="new-preset-type"
              value={newPreset.type}
              onValueChange={(v) => setNewPreset((p) => ({ ...p, type: v as PresetForm['type'] }))}
            >
              <SelectTrigger id="new-preset-type" className="h-9 w-full md:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:space-y-0 md:row-span-2 md:grid md:grid-cols-1 md:grid-rows-2 md:items-center">
            <Label htmlFor="new-preset-kind">Kind</Label>
            <Select
              name="new-preset-kind"
              value={newPreset.kind}
              onValueChange={(v) => setNewPreset((p) => ({ ...p, kind: v as PresetForm['kind'] }))}
            >
              <SelectTrigger id="new-preset-kind" className="h-9 w-full md:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="relative">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:space-y-0 md:row-span-2 md:grid md:grid-cols-1 md:grid-rows-2 md:items-center">
            <Label htmlFor="new-preset-value">Value</Label>
            <Input
              id="new-preset-value"
              name="new-preset-value"
              type="number"
              min={0}
              step={newPreset.kind === 'relative' ? 1 : 0.01}
              value={newPreset.value}
              onChange={(e) => setNewPreset((p) => ({ ...p, value: e.target.value }))}
              placeholder={newPreset.kind === 'relative' ? '10' : '5.00'}
              className="w-full md:w-24"
            />
          </div>
          <Button
            type="submit"
            className="h-9 col-span-2 md:col-span-1 md:col-start-5 md:row-start-2"
            disabled={
              !newPreset.name.trim() ||
              !newPreset.value ||
              Number.parseFloat(newPreset.value) <= 0 ||
              createMut.isPending
            }
          >
            <PlusIcon className="size-4" />
            Add
          </Button>
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Modification</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No presets. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            presets.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{formatPresetValue(p)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Edit"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMut.mutate({ data: { id: p.id } })}
                      disabled={deleteMut.isPending}
                      aria-label="Delete"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit preset</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-preset-name">Name</Label>
                <Input
                  id="edit-preset-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, type: v as PresetForm['type'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase</SelectItem>
                      <SelectItem value="decrease">Decrease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kind</Label>
                  <Select
                    value={editForm.kind}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, kind: v as PresetForm['kind'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="relative">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-preset-value">Value</Label>
                <Input
                  id="edit-preset-value"
                  type="number"
                  min={0}
                  step={editForm.kind === 'relative' ? 1 : 0.01}
                  value={editForm.value}
                  onChange={(e) => setEditForm((p) => ({ ...p, value: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !editForm.name.trim() ||
                    !editForm.value ||
                    Number.parseFloat(editForm.value) <= 0 ||
                    updateMut.isPending
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  )
}

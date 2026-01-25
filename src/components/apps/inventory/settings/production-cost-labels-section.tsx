import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Section } from '@/components/apps/inventory/section'
import { ColorInput } from '@/components/apps/inventory/settings/color-input'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  $createProductionCostLabel,
  $deleteProductionCostLabel,
  $updateProductionCostLabel,
  getProductionCostLabelsQueryOptions,
  productionCostLabelsQueryKey,
} from '@/server/functions/inventory/production-cost-labels'

const DEFAULT_COLOR = '#6b7280'

export function ProductionCostLabelsSection() {
  const queryClient = useQueryClient()
  const { data: labels = [] } = useSuspenseQuery(getProductionCostLabelsQueryOptions())

  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLOR)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editLabelName, setEditLabelName] = useState('')
  const [editLabelColor, setEditLabelColor] = useState('')

  const createLabelMut = useMutation({
    mutationFn: $createProductionCostLabel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      setNewLabelName('')
      setNewLabelColor(DEFAULT_COLOR)
      toast.success('Label added')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateLabelMut = useMutation({
    mutationFn: $updateProductionCostLabel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      setEditingLabelId(null)
      toast.success('Label updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteLabelMut = useMutation({
    mutationFn: $deleteProductionCostLabel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      toast.success('Label deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const editingLabel = editingLabelId ? labels.find((l) => l.id === editingLabelId) : null

  function openEditLabel(l: (typeof labels)[0]) {
    setEditingLabelId(l.id)
    setEditLabelName(l.name)
    setEditLabelColor(l.color)
  }

  function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault()
    const n = newLabelName.trim()
    if (!n) return
    createLabelMut.mutate({ data: { name: n, color: newLabelColor.trim() || DEFAULT_COLOR } })
  }

  function handleUpdateLabel(e: React.FormEvent) {
    e.preventDefault()
    if (!editingLabelId) return
    const n = editLabelName.trim()
    if (!n) return
    updateLabelMut.mutate({
      data: {
        id: editingLabelId,
        name: n,
        color: editLabelColor.trim() || DEFAULT_COLOR,
      },
    })
  }

  return (
    <Section
      title="Production cost labels"
      description="Labels for production cost breakdowns (e.g. Material, Labor). Used when defining production costs on products."
    >
      <form onSubmit={handleCreateLabel} className="flex flex-wrap items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="new-label-name">Name</Label>
          <Input
            id="new-label-name"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="e.g. Material"
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-label-color">Color</Label>
          <ColorInput id="new-label-color" value={newLabelColor} onChange={setNewLabelColor} />
        </div>
        <Button type="submit" disabled={!newLabelName.trim() || createLabelMut.isPending}>
          <PlusIcon className="size-4" />
          Add
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {labels.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No labels. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            labels.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.name}</TableCell>
                <TableCell>
                  <span
                    className="inline-block size-4 rounded-full border border-border"
                    style={{ backgroundColor: l.color }}
                    title={l.color}
                  />
                  <span className="ml-2 font-mono text-sm text-muted-foreground">{l.color}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditLabel(l)}
                      aria-label="Edit"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLabelMut.mutate({ data: { id: l.id } })}
                      disabled={deleteLabelMut.isPending}
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

      <Dialog
        open={editingLabelId !== null}
        onOpenChange={(open) => !open && setEditingLabelId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit production cost label</DialogTitle>
          </DialogHeader>
          {editingLabel && (
            <form onSubmit={handleUpdateLabel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-label-name">Name</Label>
                <Input
                  id="edit-label-name"
                  value={editLabelName}
                  onChange={(e) => setEditLabelName(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-label-color">Color</Label>
                <ColorInput
                  id="edit-label-color"
                  value={editLabelColor}
                  onChange={setEditLabelColor}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingLabelId(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editLabelName.trim() || updateLabelMut.isPending}>
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

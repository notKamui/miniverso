import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { title } from '@/components/ui/typography'
import {
  $createInventoryTag,
  $createOrderReferencePrefix,
  $createProductionCostLabel,
  $deleteInventoryTag,
  $deleteOrderReferencePrefix,
  $deleteProductionCostLabel,
  $updateInventoryTag,
  $updateOrderReferencePrefix,
  $updateProductionCostLabel,
  getInventoryTagsQueryOptions,
  getOrderReferencePrefixesQueryOptions,
  getProductionCostLabelsQueryOptions,
  inventoryTagsQueryKey,
  orderReferencePrefixesQueryKey,
  productionCostLabelsQueryKey,
} from '@/server/functions/inventory'

export const Route = createFileRoute('/_authed/inventory/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getOrderReferencePrefixesQueryOptions()),
      queryClient.ensureQueryData(getInventoryTagsQueryOptions()),
      queryClient.ensureQueryData(getProductionCostLabelsQueryOptions()),
    ])
    return { crumb: 'Settings' }
  },
  component: RouteComponent,
})

const DEFAULT_COLOR = '#6b7280'

function RouteComponent() {
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())
  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())
  const { data: labels = [] } = useSuspenseQuery(getProductionCostLabelsQueryOptions())

  const [newPrefix, setNewPrefix] = useState('')
  const [newSortOrder, setNewSortOrder] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrefix, setEditPrefix] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('')

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLOR)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')
  const [editTagColor, setEditTagColor] = useState('')

  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLOR)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editLabelName, setEditLabelName] = useState('')
  const [editLabelColor, setEditLabelColor] = useState('')

  const createMut = useMutation({
    mutationFn: $createOrderReferencePrefix,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      setNewPrefix('')
      setNewSortOrder('')
      toast.success('Prefix added')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: $updateOrderReferencePrefix,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      setEditingId(null)
      toast.success('Prefix updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: $deleteOrderReferencePrefix,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      toast.success('Prefix deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createTagMut = useMutation({
    mutationFn: $createInventoryTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      setNewTagName('')
      setNewTagColor(DEFAULT_COLOR)
      toast.success('Tag added')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateTagMut = useMutation({
    mutationFn: $updateInventoryTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      setEditingTagId(null)
      toast.success('Tag updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteTagMut = useMutation({
    mutationFn: $deleteInventoryTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryTagsQueryKey })
      toast.success('Tag deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createLabelMut = useMutation({
    mutationFn: $createProductionCostLabel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      setNewLabelName('')
      setNewLabelColor(DEFAULT_COLOR)
      toast.success('Label added')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateLabelMut = useMutation({
    mutationFn: $updateProductionCostLabel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      setEditingLabelId(null)
      toast.success('Label updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteLabelMut = useMutation({
    mutationFn: $deleteProductionCostLabel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productionCostLabelsQueryKey })
      toast.success('Label deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const editing = editingId ? prefixes.find((p) => p.id === editingId) : null
  const editingTag = editingTagId ? tags.find((t) => t.id === editingTagId) : null
  const editingLabel = editingLabelId ? labels.find((l) => l.id === editingLabelId) : null

  function openEdit(p: (typeof prefixes)[0]) {
    setEditingId(p.id)
    setEditPrefix(p.prefix)
    setEditSortOrder(String(p.sortOrder))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const p = newPrefix.trim()
    if (!p) return
    createMut.mutate({
      data: {
        prefix: p,
        sortOrder:
          newSortOrder !== '' ? Math.max(0, Number.parseInt(newSortOrder, 10) || 0) : undefined,
      },
    })
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const p = editPrefix.trim()
    if (!p) return
    updateMut.mutate({
      data: {
        id: editingId,
        prefix: p,
        sortOrder:
          editSortOrder !== '' ? Math.max(0, Number.parseInt(editSortOrder, 10) || 0) : undefined,
      },
    })
  }

  function handleDelete(id: string) {
    deleteMut.mutate({ data: { id } })
  }

  function openEditTag(t: (typeof tags)[0]) {
    setEditingTagId(t.id)
    setEditTagName(t.name)
    setEditTagColor(t.color)
  }

  function openEditLabel(l: (typeof labels)[0]) {
    setEditingLabelId(l.id)
    setEditLabelName(l.name)
    setEditLabelColor(l.color)
  }

  function handleCreateTag(e: React.FormEvent) {
    e.preventDefault()
    const n = newTagName.trim()
    if (!n) return
    createTagMut.mutate({ data: { name: n, color: newTagColor.trim() || DEFAULT_COLOR } })
  }

  function handleUpdateTag(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTagId) return
    const n = editTagName.trim()
    if (!n) return
    updateTagMut.mutate({
      data: {
        id: editingTagId,
        name: n,
        color: editTagColor.trim() || DEFAULT_COLOR,
      },
    })
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
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>Inventory Settings</h2>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Order reference prefixes</h3>
        <p className="text-sm text-muted-foreground">
          Prefixes used to generate order references (e.g.{' '}
          <code className="rounded bg-muted px-1">ORD</code> → ORD-1, ORD-2). At least one is
          required to create orders.
        </p>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="new-prefix">Prefix</Label>
            <Input
              id="new-prefix"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              placeholder="e.g. ORD"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-sort">Sort order (optional)</Label>
            <Input
              id="new-sort"
              type="number"
              min="0"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              placeholder="0"
              className="w-24"
            />
          </div>
          <Button type="submit" disabled={!newPrefix.trim() || createMut.isPending}>
            <PlusIcon className="size-4" />
            Add
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefix</TableHead>
              <TableHead>Sort order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prefixes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No prefixes. Add one above.
                </TableCell>
              </TableRow>
            ) : (
              prefixes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.prefix}</TableCell>
                  <TableCell>{p.sortOrder}</TableCell>
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
                        onClick={() => handleDelete(p.id)}
                        disabled={prefixes.length <= 1 || deleteMut.isPending}
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
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Product tags</h3>
        <p className="text-sm text-muted-foreground">
          Tags to categorize products (e.g. category, material). Used when creating or editing
          products.
        </p>

        <form onSubmit={handleCreateTag} className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="new-tag-name">Name</Label>
            <Input
              id="new-tag-name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g. Electronics"
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-tag-color">Color</Label>
            <div className="flex gap-1">
              <Input
                id="new-tag-color"
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-9 w-14 cursor-pointer p-1"
              />
              <Input
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                placeholder="#6b7280"
                className="w-24 font-mono text-sm"
              />
            </div>
          </div>
          <Button type="submit" disabled={!newTagName.trim() || createTagMut.isPending}>
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
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No tags. Add one above.
                </TableCell>
              </TableRow>
            ) : (
              tags.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <span
                      className="inline-block size-4 rounded-full border border-border"
                      style={{ backgroundColor: t.color }}
                      title={t.color}
                    />
                    <span className="ml-2 font-mono text-sm text-muted-foreground">{t.color}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTag(t)}
                        aria-label="Edit"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTagMut.mutate({ data: { id: t.id } })}
                        disabled={deleteTagMut.isPending}
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
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Production cost labels</h3>
        <p className="text-sm text-muted-foreground">
          Labels for production cost breakdowns (e.g. Material, Labor). Used when defining
          production costs on products.
        </p>

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
            <div className="flex gap-1">
              <Input
                id="new-label-color"
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="h-9 w-14 cursor-pointer p-1"
              />
              <Input
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                placeholder="#6b7280"
                className="w-24 font-mono text-sm"
              />
            </div>
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
      </section>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit prefix</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prefix">Prefix</Label>
                <Input
                  id="edit-prefix"
                  value={editPrefix}
                  onChange={(e) => setEditPrefix(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sort">Sort order</Label>
                <Input
                  id="edit-sort"
                  type="number"
                  min="0"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  className="w-24"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editPrefix.trim() || updateMut.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingTagId !== null} onOpenChange={(open) => !open && setEditingTagId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>
          {editingTag && (
            <form onSubmit={handleUpdateTag} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tag-name">Name</Label>
                <Input
                  id="edit-tag-name"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tag-color">Color</Label>
                <div className="flex gap-1">
                  <Input
                    id="edit-tag-color"
                    type="color"
                    value={editTagColor}
                    onChange={(e) => setEditTagColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={editTagColor}
                    onChange={(e) => setEditTagColor(e.target.value)}
                    className="w-24 font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTagId(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editTagName.trim() || updateTagMut.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="flex gap-1">
                  <Input
                    id="edit-label-color"
                    type="color"
                    value={editLabelColor}
                    onChange={(e) => setEditLabelColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={editLabelColor}
                    onChange={(e) => setEditLabelColor(e.target.value)}
                    className="w-24 font-mono text-sm"
                  />
                </div>
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
    </div>
  )
}

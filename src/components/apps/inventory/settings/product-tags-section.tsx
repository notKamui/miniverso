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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  $createInventoryTag,
  $deleteInventoryTag,
  $updateInventoryTag,
  getInventoryTagsQueryOptions,
  inventoryTagsQueryKey,
} from '@/server/functions/inventory/inventory-tags'
import { ColorInput } from './color-input'
import { SettingsSection } from './settings-section'

const DEFAULT_COLOR = '#6b7280'

export function ProductTagsSection() {
  const queryClient = useQueryClient()
  const { data: tags = [] } = useSuspenseQuery(getInventoryTagsQueryOptions())

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLOR)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')
  const [editTagColor, setEditTagColor] = useState('')

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

  const editingTag = editingTagId ? tags.find((t) => t.id === editingTagId) : null

  function openEditTag(t: (typeof tags)[0]) {
    setEditingTagId(t.id)
    setEditTagName(t.name)
    setEditTagColor(t.color)
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

  return (
    <SettingsSection
      title="Product tags"
      description="Tags to categorize products (e.g. category, material). Used when creating or editing products."
    >
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
          <ColorInput id="new-tag-color" value={newTagColor} onChange={setNewTagColor} />
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
                <ColorInput id="edit-tag-color" value={editTagColor} onChange={setEditTagColor} />
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
    </SettingsSection>
  )
}

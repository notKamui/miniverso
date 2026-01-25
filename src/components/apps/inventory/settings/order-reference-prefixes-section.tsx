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
  $createOrderReferencePrefix,
  $deleteOrderReferencePrefix,
  $updateOrderReferencePrefix,
  getOrderReferencePrefixesQueryOptions,
  orderReferencePrefixesQueryKey,
} from '@/server/functions/inventory/order-reference-prefixes'
import { Section } from '../section'

export function OrderReferencePrefixesSection() {
  const queryClient = useQueryClient()
  const { data: prefixes = [] } = useSuspenseQuery(getOrderReferencePrefixesQueryOptions())

  const [newPrefix, setNewPrefix] = useState('')
  const [newSortOrder, setNewSortOrder] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrefix, setEditPrefix] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('')

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

  const editing = editingId ? prefixes.find((p) => p.id === editingId) : null

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

  return (
    <Section
      title="Order reference prefixes"
      description={
        <>
          Prefixes used to generate order references (e.g.{' '}
          <code className="rounded bg-muted px-1">ORD</code> → ORD-1, ORD-2). At least one is
          required to create orders.
        </>
      }
    >
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
            min={0}
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
                      onClick={() => deleteMut.mutate({ data: { id: p.id } })}
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
                  min={0}
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
    </Section>
  )
}

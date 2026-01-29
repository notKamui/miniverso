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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrefix, setEditPrefix] = useState('')

  const createMut = useMutation({
    mutationFn: $createOrderReferencePrefix,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      setNewPrefix('')
      toast.success('Prefix added')
    },
  })

  const updateMut = useMutation({
    mutationFn: $updateOrderReferencePrefix,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      setEditingId(null)
      toast.success('Prefix updated')
    },
  })

  const deleteMut = useMutation({
    mutationFn: $deleteOrderReferencePrefix,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderReferencePrefixesQueryKey })
      toast.success('Prefix deleted')
    },
  })

  const editing = editingId ? prefixes.find((p) => p.id === editingId) : null

  function openEdit(p: (typeof prefixes)[0]) {
    setEditingId(p.id)
    setEditPrefix(p.prefix)
  }

  function handleCreate(e: React.SubmitEvent) {
    e.preventDefault()
    const p = newPrefix.trim()
    if (!p) return
    createMut.mutate({ data: { prefix: p } })
  }

  function handleUpdate(e: React.SubmitEvent) {
    e.preventDefault()
    if (!editingId) return
    const p = editPrefix.trim()
    if (!p) return
    updateMut.mutate({ data: { id: editingId, prefix: p } })
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
        <Button type="submit" disabled={!newPrefix.trim() || createMut.isPending}>
          <PlusIcon className="size-4" />
          Add
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prefix</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prefixes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                No prefixes. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            prefixes.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.prefix}</TableCell>
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

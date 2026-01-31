import { useServerFn } from '@tanstack/react-start'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { cn } from '@/lib/utils/cn'
import { $setColumnVisibility } from '@/server/functions/column-visibility'

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
  className?: string
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
  enableColumnHiding?: boolean
  columnVisibilityStorageKey?: string
  initialColumnVisibility?: VisibilityState
  toolbarSlot?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'No data',
  className,
  onRowClick,
  onRowDoubleClick,
  enableColumnHiding = true,
  columnVisibilityStorageKey,
  initialColumnVisibility,
  toolbarSlot,
}: DataTableProps<TData, TValue>) {
  const setColumnVisibility = useServerFn($setColumnVisibility)

  const [columnVisibility, setColumnVisibility_] = useState<VisibilityState>(
    () => initialColumnVisibility ?? {},
  )

  const onColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      setColumnVisibility_((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (columnVisibilityStorageKey) {
          void setColumnVisibility({ data: { key: columnVisibilityStorageKey, state: next } })
        }
        return next
      })
    },
    [columnVisibilityStorageKey, setColumnVisibility],
  )

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange,
    state: { columnVisibility },
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows
  const hideableColumns = enableColumnHiding
    ? table.getAllLeafColumns().filter((c) => c.getCanHide())
    : []
  const showHeaderBar = Boolean(toolbarSlot) || hideableColumns.length > 0

  return (
    <div className={cn('rounded-md border', className)}>
      {showHeaderBar && (
        <div className="flex flex-col flex-wrap justify-between gap-2 border-b p-2 md:flex-row md:items-center">
          {toolbarSlot}
          {hideableColumns.length > 0 && (
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hideableColumns.map((col) => {
                    const label =
                      typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id
                    return (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        checked={col.getIsVisible()}
                        onCheckedChange={(checked) => col.toggleVisibility(Boolean(checked))}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          {headerGroups.map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta as { stickyRight?: boolean } | undefined
                const isStickyRight = meta?.stickyRight === true
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.columnDef.size }}
                    className={cn(
                      'text-nowrap',
                      isStickyRight && 'sticky right-0 z-10 border-l bg-background',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows?.length ? (
            rows.map((row) => (
              <DataRow
                key={row.id}
                row={row}
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function DataRow<TData>({
  row,
  onRowClick,
  onRowDoubleClick,
}: {
  row: Row<TData>
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
}) {
  const { onTouchStart, onTouchEnd } = useLongPress(() => onRowDoubleClick?.(row.original))

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      onClick={() => onRowClick?.(row.original)}
      onDoubleClick={() => onRowDoubleClick?.(row.original)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn('group', (onRowClick || onRowDoubleClick) && 'cursor-pointer')}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as { stickyRight?: boolean } | undefined
        const isStickyRight = meta?.stickyRight === true
        return (
          <TableCell
            key={cell.id}
            className={cn(
              'max-w-0 overflow-hidden whitespace-nowrap',
              isStickyRight &&
                'sticky right-0 z-10 shrink-0 border-l bg-background group-hover:bg-muted/50 max-md:min-w-12',
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

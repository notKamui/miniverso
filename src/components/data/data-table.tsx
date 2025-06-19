import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { cn } from '@/lib/utils'

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
  className?: string
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'No data',
  className,
  onRowClick,
  onRowDoubleClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          {headerGroups.map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.column.columnDef.size }}
                  className="text-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
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
  const { onTouchStart, onTouchEnd } = useLongPress(() =>
    onRowDoubleClick?.(row.original),
  )

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      onClick={() => onRowClick?.(row.original)}
      onDoubleClick={() => onRowDoubleClick?.(row.original)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn((onRowClick || onRowDoubleClick) && 'cursor-pointer')}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

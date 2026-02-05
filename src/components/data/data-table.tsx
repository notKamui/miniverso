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

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

export type ServerPagination = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

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
  /** When set, pagination is controlled by the parent (URL/server). Data is the current page only. Footer with page size and prev/next is shown only when this is set. */
  pagination?: ServerPagination
  /** Page size options for the footer (only used when pagination is set). */
  pageSizeOptions?: readonly number[]
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
  pagination: serverPagination,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
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

  const showPaginationFooter = serverPagination != null

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

  const pageSize = showPaginationFooter ? serverPagination.pageSize : 0
  const pageIndex = showPaginationFooter ? serverPagination.page - 1 : 0
  const totalRows = showPaginationFooter ? serverPagination.total : 0
  const rowCount = rows.length
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = pageIndex * pageSize + rowCount
  const totalPages = totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize)
  const pageSizeOptionsList = showPaginationFooter
    ? [...new Set([...pageSizeOptions, pageSize])].toSorted((a, b) => a - b)
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
      {showPaginationFooter && (
        <div className="flex flex-col gap-2 border-t p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <p className="text-sm text-muted-foreground">
              {totalRows === 0 ? '0' : `${startRow}–${endRow}`} of {totalRows}
            </p>
            {pageSizeOptionsList.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Rows:</span>
                {pageSizeOptionsList.map((size) => (
                  <Button
                    key={size}
                    variant={pageSize === size ? 'secondary' : 'outline'}
                    size="sm"
                    className="min-w-9 px-2"
                    onClick={() => serverPagination.onPageSizeChange(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination.onPageChange(serverPagination.page - 1)}
              disabled={pageIndex <= 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination.onPageChange(serverPagination.page + 1)}
              disabled={pageIndex + 1 >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
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

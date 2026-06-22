import { useServerFn } from '@tanstack/react-start'
import { useSelector } from '@tanstack/react-store'
import {
  columnSizingFeature,
  columnVisibilityFeature,
  type ColumnDef,
  type ColumnVisibilityState,
  metaHelper,
  type ReactTable,
  type Row,
  type RowData,
  tableFeatures,
  type Updater,
  useTable,
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

export const dataTableFeatures = tableFeatures({
  columnSizingFeature,
  columnVisibilityFeature,
  columnMeta: metaHelper<{ stickyRight?: boolean; grow?: boolean }>(),
})
export type DataTableFeatures = typeof dataTableFeatures

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

export type ServerPagination = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData, any>[]
  data: TData[]
  emptyMessage?: string
  className?: string
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
  enableColumnHiding?: boolean
  columnVisibilityStorageKey?: string
  initialColumnVisibility?: ColumnVisibilityState
  toolbarSlot?: React.ReactNode
  /** When set, pagination is controlled by the parent (URL/server). Data is the current page only. Footer with page size and prev/next is shown only when this is set. */
  pagination?: ServerPagination
  /** Page size options for the footer (only used when pagination is set). */
  pageSizeOptions?: readonly number[]
}

export function DataTable<TData extends RowData>({
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
}: DataTableProps<TData>) {
  const setColumnVisibility = useServerFn($setColumnVisibility)

  const [columnVisibility, setColumnVisibility_] = useState<ColumnVisibilityState>(
    () => initialColumnVisibility ?? {},
  )

  const onColumnVisibilityChange = useCallback(
    (updater: Updater<ColumnVisibilityState>) => {
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

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
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
                <table.Subscribe selector={(s) => s.columnVisibility}>
                  {() => (
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
                  )}
                </table.Subscribe>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <table.Subscribe selector={(s) => s.columnVisibility}>
            {() =>
              headerGroups.map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => {
                    if (!header.column.getIsVisible()) return null
                    const { stickyRight, grow } = header.column.columnDef.meta ?? {}
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: grow ? undefined : header.column.columnDef.size }}
                        className={cn('text-nowrap', stickyRight && 'sticky right-0 z-10')}
                      >
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))
            }
          </table.Subscribe>
        </TableHeader>
        <TableBody>
          {rows?.length ? (
            rows.map((row) => (
              <DataRow
                key={row.id}
                table={table}
                row={row}
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
              />
            ))
          ) : (
            <table.Subscribe selector={(s) => s.columnVisibility}>
              {() => (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </table.Subscribe>
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

function DataRow<TData extends RowData>({
  table,
  row,
  onRowClick,
  onRowDoubleClick,
}: {
  table: ReactTable<DataTableFeatures, TData>
  row: Row<DataTableFeatures, TData>
  onRowClick?: (row: TData) => void
  onRowDoubleClick?: (row: TData) => void
}) {
  useSelector(table.atoms.columnVisibility)
  const { onTouchStart, onTouchEnd } = useLongPress(() => onRowDoubleClick?.(row.original))

  return (
    <TableRow
      onClick={() => onRowClick?.(row.original)}
      onDoubleClick={() => onRowDoubleClick?.(row.original)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn('group', (onRowClick || onRowDoubleClick) && 'cursor-pointer')}
    >
      {row.getVisibleCells().map((cell) => {
        const { stickyRight, grow } = cell.column.columnDef.meta ?? {}
        return (
          <TableCell
            key={cell.id}
            className={cn(
              !stickyRight && !grow && 'max-w-0 overflow-hidden whitespace-nowrap',
              grow && 'truncate',
              stickyRight && 'sticky right-0 z-10',
            )}
          >
            <table.FlexRender cell={cell} />
          </TableCell>
        )
      })}
    </TableRow>
  )
}
